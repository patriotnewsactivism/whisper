import sys, types, importlib, pathlib
from fastapi.testclient import TestClient

# Add the server directory to the path for direct imports
sys.path.append(str(pathlib.Path(__file__).resolve().parent))

# Stub heavy dependency before importing the app
sys.modules.setdefault("faster_whisper", types.SimpleNamespace(WhisperModel=object))

app_module = importlib.import_module("app")

# Patch heavy functions to no-ops for tests
app_module.ffmpeg_clean = lambda inp, out: None
app_module.get_model = lambda name, device, compute_type: object()
app_module.transcribe_segments = lambda mdl, wav, language: [{"start": 0, "end": 1, "text": "hi"}]

client = TestClient(app_module.app)


def test_create_job_sanitizes_filename(tmp_path):
    files = {"file": ("dir/sub/../foo.wav", b"data", "audio/wav")}
    resp = client.post("/jobs", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["filename"] == "foo.wav"
    jid = data["job_id"]
    assert app_module.JOB_STATUS[jid]["filename"] == "foo.wav"


def test_create_job_rejects_bad_filename():
    files = {"file": ("..", b"data", "audio/wav")}
    resp = client.post("/jobs", files=files)
    assert resp.status_code == 400
