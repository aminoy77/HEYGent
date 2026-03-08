import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { runAgent } from './agent.js';
import { initFilesystem, getFileTree } from './tools/filesystem.js';
import { initTerminal, runCommand, sendInput, killProcess, createSession } from './tools/terminal.js';
import { closeBrowser } from './tools/browser.js';

process.on('unhandledRejection', err => console.error('[unhandledRejection]', err?.message || err));
process.on('uncaughtException',  err => console.error('[uncaughtException]',  err?.message || err));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_PATH = path.resolve(__dirname, '../workspace');
const ENV_PATH = path.resolve(__dirname, '../.env');

mkdirSync(WORKSPACE_PATH, { recursive: true });
initFilesystem(WORKSPACE_PATH);
initTerminal(WORKSPACE_PATH);

// Load .env into process.env
function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  readFileSync(ENV_PATH, 'utf-8').split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k) process.env[k] = v;
    }
  });
}

// Persist a key to .env file
function saveKey(key, value) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
  const lines = content.split('\n').filter(l => !l.startsWith(key + '=') && l.trim());
  lines.push(`${key}=${value}`);
  writeFileSync(ENV_PATH, lines.join('\n') + '\n');
  process.env[key] = value;
}

loadEnv();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

let previewPort = null;
app.get('/api/preview-port', (req, res) => res.json({ port: previewPort }));
app.get('/api/info', (req, res) => res.json({ workspacePath: WORKSPACE_PATH, version: '1.0.0' }));
app.get('/api/keys', (req, res) => res.json({
  hasMinimaxKey: !!process.env.MINIMAX_API_KEY,
  hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY
}));

app.get('/api/file', async (req, res) => {
  try {
    const { readFile } = await import('fs/promises');
    const fp = path.resolve(WORKSPACE_PATH, req.query.path || '');
    if (!fp.startsWith(WORKSPACE_PATH)) return res.status(403).json({ error: 'Access denied' });
    const content = await readFile(fp, 'utf-8');
    res.json({ content });
  } catch (err) { res.status(404).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

function safeSend(ws, data) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(data)); } catch {}
}

wss.on('connection', (ws) => {
  let conversationHistory = [];
  let isProcessing = false;

  const DEFAULT_SESSIONS = ['main', 'terminal-2', 'terminal-3'];
  DEFAULT_SESSIONS.forEach(id => createSession(id));

  console.log('Client connected');
  const pingTimer = setInterval(() => { if (ws.readyState === ws.OPEN) ws.ping(); }, 20000);

  getFileTree().then(tree => safeSend(ws, {
    type: 'init',
    workspacePath: WORKSPACE_PATH,
    fileTree: tree,
    hasMinimaxKey: !!process.env.MINIMAX_API_KEY,
    hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
    sessions: DEFAULT_SESSIONS
  })).catch(() => {});

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try {
      switch (msg.type) {
        case 'set_minimax_key':
          saveKey('MINIMAX_API_KEY', msg.key.trim());
          safeSend(ws, { type: 'status', ok: true, message: 'MiniMax key saved' });
          break;

        case 'set_openrouter_key':
          saveKey('OPENROUTER_API_KEY', msg.key.trim());
          safeSend(ws, { type: 'status', ok: true, message: 'OpenRouter key saved' });
          break;

        case 'chat':
          if (isProcessing) { safeSend(ws, { type: 'error', message: 'Already processing, please wait.' }); return; }
          if (!process.env.MINIMAX_API_KEY && !process.env.OPENROUTER_API_KEY) {
            safeSend(ws, { type: 'error', message: 'Add at least one API key.' }); return;
          }
          isProcessing = true;
          safeSend(ws, { type: 'stream_start' });
          try {
            const result = await runAgent({
              message: msg.message,
              conversationHistory,
              minimaxKey: process.env.MINIMAX_API_KEY,
              openrouterKey: process.env.OPENROUTER_API_KEY,
              workspacePath: WORKSPACE_PATH,
              onStream:            chunk => safeSend(ws, { type: 'stream_chunk', content: chunk }),
              onToolCall:          tool  => safeSend(ws, { type: 'tool_call', tool }),
              onToolResult:        r     => safeSend(ws, { type: 'tool_result', result: r }),
              onBrowserScreenshot: data  => safeSend(ws, { type: 'browser_screenshot', data }),
              onModelSwitch:       p     => safeSend(ws, { type: 'model_switch', model: p }),
              onFileTreeUpdate: async () => { const tree = await getFileTree(); safeSend(ws, { type: 'file_tree', tree }); },
              onTerminalOutput: data => safeSend(ws, { type: 'terminal_output', data, sessionId: 'main' })
            });
            conversationHistory.push({ role: 'user', content: msg.message });
            if (result.response) conversationHistory.push({ role: 'assistant', content: result.response });
            if (conversationHistory.length > 40) conversationHistory = conversationHistory.slice(-40);
            safeSend(ws, { type: 'stream_end', provider: result.provider });
          } catch (err) {
            console.error('Agent error:', err.message);
            safeSend(ws, { type: 'error', message: err.message });
          } finally { isProcessing = false; }
          break;

        case 'terminal_command': {
          const sid = msg.sessionId || 'main';
          createSession(sid);
          runCommand(msg.command,
            data => safeSend(ws, { type: 'terminal_output', data, sessionId: sid }),
            code => safeSend(ws, { type: 'terminal_exit', code, sessionId: sid }),
            sid);
          const portMatch = msg.command.match(/(?:--port|-p)\s*(\d{4,5})|:(\d{4,5})/);
          if (portMatch) { previewPort = parseInt(portMatch[1] || portMatch[2]); safeSend(ws, { type: 'preview_port', port: previewPort }); }
          break;
        }
        case 'terminal_input':  sendInput(msg.sessionId || 'main', msg.data); break;
        case 'terminal_kill':   killProcess(msg.sessionId || 'main'); break;
        case 'set_preview_port': previewPort = msg.port; safeSend(ws, { type: 'preview_port', port: previewPort }); break;
        case 'get_file_tree':   getFileTree().then(tree => safeSend(ws, { type: 'file_tree', tree })); break;
        case 'clear_conversation': conversationHistory = []; safeSend(ws, { type: 'conversation_cleared' }); break;
      }
    } catch (err) {
      console.error('WS handler error:', err.message);
      safeSend(ws, { type: 'error', message: err.message });
      isProcessing = false;
    }
  });

  ws.on('close', () => { clearInterval(pingTimer); console.log('Client disconnected'); });
  ws.on('error', err => console.error('WS error:', err.message));
});

process.on('SIGINT', async () => { await closeBrowser().catch(() => {}); process.exit(0); });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 HEYgent running at http://localhost:${PORT}`);
  console.log(`📁 Workspace: ${WORKSPACE_PATH}`);
  console.log(`🤖 MiniMax:    ${process.env.MINIMAX_API_KEY    ? '✓' : '✗'}`);
  console.log(`🔄 OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✓' : '✗'}\n`);
});
