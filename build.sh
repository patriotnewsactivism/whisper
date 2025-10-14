#!/usr/bin/env bash
set -euo pipefail

echo "🔨 Starting Whisper Transcriber build process..."
echo "=============================================="

# Navigate to client directory
cd client

echo "📦 Installing client dependencies..."
npm ci --no-audit --no-fund

echo "🏗️  Building client application..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Build output location: client/dist/"
ls -la dist/

# Return to root directory
cd ..

echo "🚀 Ready for deployment!"
