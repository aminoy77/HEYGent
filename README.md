# ⚡ HEYgent

An AI coding tool with smart model routing, real browser control, and a sandboxed workspace.

## Models Used (all free)

| Task | Model |
|------|-------|
| 💻 Coding | Qwen 3 Coder 480B |
| 🧠 Reasoning/Math | DeepSeek R1 |
| 💬 General Chat | Llama 3.3 70B |
| 📄 Long Documents | Gemini 2.0 Flash |
| ✍️ Creative Writing | Trinity Large |
| ⚡ Quick Tasks | Step 3.5 Flash |

## Requirements

- Node.js 18+
- macOS (tested on M1)
- OpenRouter API key (free at [openrouter.ai](https://openrouter.ai))

## Installation

```bash
# 1. Install backend deps
cd backend && npm install

# 2. Install Playwright browsers
npx playwright install chromium
# Optional: also install Chrome channel support
npx playwright install chrome

# 3. Install frontend deps
cd ../frontend && npm install

# 4. Set your API key
cd ..
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

## Running

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
node --env-file=../.env server.js
```

**Terminal 2 — Frontend (dev mode):**
```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

## Workspace

All files the AI creates are sandboxed inside the `workspace/` folder.
The AI cannot access files outside this directory.

## Security Notes

- File operations are sandboxed to `workspace/`
- Dangerous commands (`rm -rf /`, etc.) are blocked
- API key is stored in memory only (not persisted to disk from UI)
- Browser uses a persistent profile in `~/.heygent/browser-data`
