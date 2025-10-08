# fix-merge-and-clean.ps1
Write-Host "=== Starting Git cleanup and conflict resolution ==="

Set-Location "C:\react-projects\whisper-app"

# Ensure we're in a Git repo
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not a Git repository. Exiting."
    exit
}

# Auto-resolve merge conflicts in favor of your local changes
Write-Host "Resolving merge conflicts in favor of local changes..."
git merge --strategy-option ours

# Add a .gitignore for good hygiene
@"
# Dependencies
node_modules/
client/node_modules/
server/node_modules/

# Build output
dist/
build/
client/dist/
server/dist/

# Environment and logs
.env
*.log

# System files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
"@ | Set-Content -Path ".gitignore" -Encoding UTF8

Write-Host "Updated .gitignore"

# Unstage junk if needed
git restore --staged node_modules,client/node_modules,server/node_modules,dist,build 2>$null

# Remove tracked junk
git rm -r --cached node_modules client/node_modules server/node_modules dist build -f 2>$null

# Stage all remaining clean files
git add .

# Commit the resolution and cleanup
git commit -m "Auto-resolved merge conflicts (kept local changes) and cleaned repository"

Write-Host "=== Merge conflicts resolved and cleanup complete ==="
Write-Host "You can now run 'git push' to sync changes."
