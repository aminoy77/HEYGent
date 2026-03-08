#!/bin/bash
set -e

echo "⚡ Installing Vibe Coder..."

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

echo "✓ Node $(node -v) detected"

# Backend
echo "\n📦 Installing backend dependencies..."
cd backend && npm install
echo "✓ Backend deps installed"

# Playwright
echo "\n🌐 Installing Playwright browser..."
npx playwright install chromium
echo "✓ Playwright installed"

# Frontend
echo "\n🎨 Installing frontend dependencies..."
cd ../frontend && npm install
echo "✓ Frontend deps installed"

# .env
cd ..
if [ ! -f .env ]; then
  cp .env.example .env
  echo "\n⚠️  Created .env — add your OPENROUTER_API_KEY to .env"
  echo "   Get a free key at: https://openrouter.ai"
fi

echo "\n✅ Installation complete!"
echo ""
echo "To run:"
echo "  Terminal 1: cd backend && node --env-file=../.env server.js"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Then open:  http://localhost:5173"
