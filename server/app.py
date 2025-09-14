from __future__ import annotations
import os, uuid, asyncio, subprocess
from pathlib import Path
from typing import Dict, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from concurrent.futures import ThreadPoolExecutor

from faster_whisper import WhisperModel

APP_DIR = Path(__file__).parent
JOBS_DIR = APP_DIR / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

# simple in-process caches/state
MODEL_CACHE: Dict[tuple, WhisperModel] = {}
JOB_STATUS: Dict[str, dict] = {}
CLIENTS: Dict[str, List[WebSocket]] = {}
EXEC = ThreadPoolExecutor(max_workers=1)

def get_model(name: str, device: str, compute_type: str) -> WhisperModel:
    key = (name, device, compute_type)
    if key not in MODEL_CACHE:
        MODEL_CACHE[key] = WhisperModel(name, device=device, compute_type=compute_type)
    return MODEL_CACHE[key]

def ffmpeg_clean(inp: Path, out_wav: Path):
    # convert to mono 16k wav for stable ASR
    cmd = ["ffmpeg", "-y", "-i", str(inp), "-ac", "1", "-ar", "16000", str(out_wav)]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def transcribe_segments(model: WhisperModel, wav: Path, language: str):
    segments, info = model.transcribe(
        str(wav),
        language=language,
        task="transcribe",
        beam_size=5,
        vad_filter=True,
    )
    out = []
    for s in segments:
        out.append({"start": s.start, "end": s.end, "text": s.text.strip()})
    return out

def to_srt(segs):
    def fmt(t):
        ms = int(t*1000); h=ms//3600000; m=(ms%3600000)//60000; s=(ms%60000)//1000; ms%=1000
        return f"{h:02}:{m:02}:{s:02},{ms:03}"
    lines=[]
    for i, s in enumerate(segs, 1):
        lines.append(str(i))
        lines.append(f"{fmt(s['start'])} --> {fmt(s['end'])}")
        lines.append(s["text"]); lines.append("")
    return "\n".join(lines)

def to_vtt(segs):
    def fmt(t):
        ms = int(t*1000); h=ms//3600000; m=(ms%3600000)//60000; s=(ms%60000)//1000; ms%=1000
        return f"{h:02}:{m:02}:{s:02}.{ms:03}"
    out = ["WEBVTT",""]
    for s in segs:
        out.append(f"{fmt(s['start'])} --> {fmt(s['end'])}")
        out.append(s["text"]); out.append("")
    return "\n".join(out)

app = FastAPI(title="Whisper Transcriber")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # open for dev; lock down later if you want
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health(): return {"ok": True}

@app.post("/jobs")
async def create_job(
    file: UploadFile = File(...),
    model: str = Form("large-v3"),
    device: str = Form("cuda"),            # use "cpu" if no GPU/cudnn
    compute_type: str = Form("float16"),   # try "int8_float16" if VRAM is tight
    language: str = Form("en"),
):
    jid = str(uuid.uuid4())
    jdir = JOBS_DIR / jid
    (jdir/"input").mkdir(parents=True, exist_ok=True)
    (jdir/"out").mkdir(parents=True, exist_ok=True)

    # sanitize the incoming filename, ensuring it is usable as a file
    safe_name = Path(file.filename or "").name
    if safe_name in ("", ".", ".."):
        raise HTTPException(400, "invalid filename")

    raw_path = jdir/"input"/safe_name
    with open(raw_path, "wb") as f:
        f.write(await file.read())

    JOB_STATUS[jid] = {"state": "queued", "msg": "", "filename": safe_name}

    async def run():
        def log(m):
            JOB_STATUS[jid]["msg"] = m
            for ws in CLIENTS.get(jid, []):
                try: asyncio.create_task(ws.send_text(m))
                except: pass

        def work():
            try:
                log("preprocess: ffmpeg → wav")
                wav = jdir/"input"/(raw_path.stem + ".wav")
                ffmpeg_clean(raw_path, wav)

                # VRAM-friendly retry strategy
                try_order = [
                    (model, device, compute_type),
                    (model, device, "int8_float16"),
                    ("large-v2", device, "int8_float16"),
                    ("medium.en", device, "int8_float16"),
                    (model, "cpu", "int8"),
                ]
                last_err = None
                for m, d, c in try_order:
                    try:
                        log(f"loading model {m} [{d}/{c}]")
                        mdl = get_model(m, d, c)
                        log("transcribing…")
                        segs = transcribe_segments(mdl, wav, language)
                        stem = raw_path.stem
                        (jdir/"out"/f"{stem}.txt").write_text(
                            "\n".join(s["text"] for s in segs), encoding="utf-8")
                        (jdir/"out"/f"{stem}.srt").write_text(to_srt(segs), encoding="utf-8")
                        (jdir/"out"/f"{stem}.vtt").write_text(to_vtt(segs), encoding="utf-8")
                        JOB_STATUS[jid]["state"] = "done"
                        log("done")
                        return
                    except RuntimeError as e:
                        last_err = e
                        log(f"retry: {e}")
                        continue
                JOB_STATUS[jid]["state"] = "error"
                JOB_STATUS[jid]["msg"] = f"{last_err}"
            except Exception as e:
                JOB_STATUS[jid]["state"] = "error"
                JOB_STATUS[jid]["msg"] = str(e)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(EXEC, work)

    asyncio.create_task(run())
    return {"job_id": jid, "filename": safe_name}

@app.get("/jobs/{jid}")
def job_status(jid: str):
    return JOB_STATUS.get(jid, {"state": "unknown"})

@app.get("/jobs/{jid}/result")
def job_result(jid: str, filename: str, ext: str):
    p = JOBS_DIR / jid / "out" / f"{Path(filename).stem}.{ext}"
    if not p.exists():
        raise HTTPException(404, "not ready")
    return FileResponse(p)

@app.websocket("/ws/jobs/{jid}")
async def ws_progress(ws: WebSocket, jid: str):
    await ws.accept()
    CLIENTS.setdefault(jid, []).append(ws)
    try:
        while True:
            await asyncio.sleep(60)
    except Exception:
        pass
    finally:
        CLIENTS[jid].remove(ws)
