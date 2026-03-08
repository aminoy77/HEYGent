import { filesystemTools } from './tools/filesystem.js';
import { runCommand } from './tools/terminal.js';
import { browserSearch } from './tools/browser.js';

const MINIMAX = {
  url: 'https://ollama.com/api/chat',
  model: 'minimax-m2.5',
  name: 'MiniMax M2.5',
  shortName: 'MiniMax',
  color: '#06b6d4'
};

const TRINITY = {
  url: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'arcee-ai/trinity-large-preview:free',
  name: 'Trinity Large',
  shortName: 'Trinity',
  color: '#f472b6'
};

function systemPrompt(wp) {
  return `You are HEYgent — an expert AI software engineer with full access to a sandboxed workspace.

WORKSPACE: ${wp}
All file operations are sandboxed here. You CANNOT access files outside it.

TOOLS AVAILABLE — call them on their own line as valid JSON:
{"tool": "write_file", "args": {"path": "main.py", "content": "..."}}
{"tool": "read_file", "args": {"path": "file.txt"}}
{"tool": "run_command", "args": {"command": "python main.py"}}
{"tool": "create_directory", "args": {"path": "src"}}
{"tool": "list_files", "args": {"path": "."}}
{"tool": "browser_search", "args": {"query": "how to..."}}

RULES:
- When asked to build something, USE THE TOOLS to create actual files. Do not just show code in chat.
- Write complete production-quality code. No TODOs or placeholders.
- After writing code, verify it runs with run_command.
- Fix errors you encounter — don't just report them.
- For pip installs, always try: pip install X || pip3 install X || python3 -m pip install X (try all three if one fails).
- When running Python, prefer python3 over python.`;
}

class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- Ollama cloud streaming (native /api/chat format) ---
async function* streamOllama(provider, messages, apiKey) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 45000);
  let res;
  try {
    res = await fetch(provider.url, { signal: ctrl.signal,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: true
    })
  });
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error(`${provider.shortName} timed out after 45s`);
    throw e;
  }
  clearTimeout(timeout);

  if (res.status === 401) throw new Error(`401 on ${provider.shortName}: unauthorized — check your Ollama API key at ollama.com/settings/api-keys`);
  if (res.status === 429) throw new RateLimitError(`429 on ${provider.shortName}: rate limited`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} on ${provider.shortName}: ${body.substring(0, 300)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const chunk = JSON.parse(trimmed);
        yield chunk;
        if (chunk.done) return;
      } catch {}
    }
  }
}

// --- OpenRouter streaming (OpenAI /v1/chat/completions format) ---
async function* streamOpenRouter(provider, messages, apiKey) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 45000);
  let res;
  try {
    res = await fetch(provider.url, { signal: ctrl.signal,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'HEYgent'
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: true,
      max_tokens: 8192,
      temperature: 0.1
    })
  });
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error(`${provider.shortName} timed out after 45s`);
    throw e;
  }
  clearTimeout(timeout);

  if (res.status === 429) throw new RateLimitError(`429 on ${provider.shortName}: rate limited`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} on ${provider.shortName}: ${body.substring(0, 300)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim();
      if (d === '[DONE]') return;
      try { yield JSON.parse(d); } catch {}
    }
  }
}

async function callMinimax(messages, apiKey, onText) {
  let text = '';
  const gen = streamOllama(MINIMAX, messages, apiKey);
  for await (const chunk of gen) {
    // Ollama format: { message: { content: "..." }, done: false }
    const content = chunk.message?.content;
    if (content) { text += content; onText(content); }
  }
  return text;
}

async function callTrinity(messages, apiKey, onText) {
  let text = '';
  const gen = streamOpenRouter(TRINITY, messages, apiKey);
  for await (const chunk of gen) {
    // OpenAI format: { choices: [{ delta: { content: "..." } }] }
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) { text += content; onText(content); }
  }
  return text;
}

async function callWithFallback({ messages, minimaxKey, openrouterKey, onStream, onModelSwitch }) {
  // Try MiniMax first
  if (minimaxKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callMinimax(messages, minimaxKey, onStream);
        return { text, provider: MINIMAX };
      } catch (err) {
        if (err instanceof RateLimitError) {
          if (attempt === 0) { await sleep(2000); continue; }
          break; // fall through to Trinity
        }
        throw err; // 401, network errors etc — don't silently fall back
      }
    }
  }

  // Fallback to Trinity
  if (openrouterKey) {
    onModelSwitch(TRINITY);
    const text = await callTrinity(messages, openrouterKey, onStream);
    return { text, provider: TRINITY };
  }

  throw new Error('No API keys available. Add MINIMAX_API_KEY or OPENROUTER_API_KEY in .env');
}

function extractToolCalls(text) {
  const calls = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{') || !t.includes('"tool"')) continue;
    try {
      const p = JSON.parse(t);
      if (p.tool && p.args !== undefined) calls.push(p);
    } catch {}
  }
  return calls;
}

function stripToolCalls(text) {
  return text.split('\n').filter(line => {
    const t = line.trim();
    if (!t.startsWith('{') || !t.includes('"tool"')) return true;
    try { const p = JSON.parse(t); return !(p.tool && p.args !== undefined); } catch { return true; }
  }).join('\n').trim();
}

export async function runAgent({ message, conversationHistory, minimaxKey, openrouterKey,
  workspacePath, onStream, onToolCall, onToolResult, onBrowserScreenshot,
  onFileTreeUpdate, onTerminalOutput, onModelSwitch }) {

  const msgs = [...conversationHistory, { role: 'user', content: message }];
  let finalText = '';
  let activeProvider = minimaxKey ? MINIMAX : TRINITY;

  for (let iter = 0; iter < 10; iter++) {
    const fullMsgs = [{ role: 'system', content: systemPrompt(workspacePath) }, ...msgs];

    const { text, provider } = await callWithFallback({
      messages: fullMsgs,
      minimaxKey,
      openrouterKey,
      onStream,
      onModelSwitch: p => { activeProvider = p; onModelSwitch(p); }
    });

    activeProvider = provider;
    const toolCalls = extractToolCalls(text);
    const visibleText = stripToolCalls(text);

    if (!toolCalls.length) { finalText = visibleText; break; }

    msgs.push({ role: 'assistant', content: text });

    let toolResultsText = '';
    for (const tc of toolCalls) {
      const { tool: name, args } = tc;
      onToolCall({ name, args });
      let result;
      try {
        if (name === 'read_file')             result = await filesystemTools.read_file(args);
        else if (name === 'write_file')       { result = await filesystemTools.write_file(args); onFileTreeUpdate(); }
        else if (name === 'create_directory') { result = await filesystemTools.create_directory(args); onFileTreeUpdate(); }
        else if (name === 'list_files')       result = JSON.stringify(await filesystemTools.list_files(args), null, 2);
        else if (name === 'run_command') {
          result = await new Promise(res => {
            let out = '';
            runCommand(args.command, d => { out += d; onTerminalOutput(d); },
              code => res(`[exit ${code}]\n${out}`), `agent-${Date.now()}`);
          });
        } else if (name === 'browser_search') {
          const br = await browserSearch(args);
          if (br.screenshot) onBrowserScreenshot({ screenshot: br.screenshot, url: br.url, title: br.title });
          result = JSON.stringify({ url: br.url, title: br.title, content: br.content?.substring(0, 3000) });
        } else result = `Unknown tool: ${name}`;
      } catch (err) { result = `Tool error: ${err.message}`; }

      const resultStr = (typeof result === 'string' ? result : JSON.stringify(result)).substring(0, 3000);
      onToolResult({ name, result: resultStr });
      toolResultsText += `\nTool ${name} result:\n${resultStr}\n`;
    }

    msgs.push({ role: 'user', content: `Tool results:${toolResultsText}\nContinue.` });
  }

  return { response: finalText, provider: activeProvider };
}
