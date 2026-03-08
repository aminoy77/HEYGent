import { spawn } from 'child_process';

let WORKSPACE_ROOT = null;
const sessions = new Map(); // sessionId -> { proc, onData, onExit }

const BLOCKED = ['rm -rf /', 'sudo rm -rf', ':(){:|:&};:', 'dd if=/dev/zero', 'mkfs'];

export function initTerminal(workspacePath) {
  WORKSPACE_ROOT = workspacePath;
}

export function createSession(sessionId) {
  if (sessions.has(sessionId)) return; // already exists
  sessions.set(sessionId, { proc: null, buffer: [] });
}

export function destroySession(sessionId) {
  const s = sessions.get(sessionId);
  if (s?.proc) s.proc.kill('SIGTERM');
  sessions.delete(sessionId);
}

export function runCommand(command, onData, onExit, sessionId = 'default') {
  for (const bad of BLOCKED) {
    if (command.includes(bad)) {
      onData(`\x1b[31m[BLOCKED] Dangerous command: ${bad}\x1b[0m\n`);
      onExit(1);
      return null;
    }
  }

  // Kill any existing proc in this session
  const existing = sessions.get(sessionId);
  if (existing?.proc) {
    try { existing.proc.kill('SIGTERM'); } catch {}
  }

  const proc = spawn('bash', ['-c', command], {
    cwd: WORKSPACE_ROOT,
    env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1', PYTHONUNBUFFERED: '1' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  sessions.set(sessionId, { proc, onData, onExit });

  proc.stdout.on('data', d => onData(d.toString()));
  proc.stderr.on('data', d => onData(d.toString()));
  proc.on('close', code => {
    const s = sessions.get(sessionId);
    if (s) sessions.set(sessionId, { ...s, proc: null });
    onExit(code ?? 0);
  });
  proc.on('error', err => {
    onData(`\x1b[31mProcess error: ${err.message}\x1b[0m\n`);
    onExit(1);
  });

  return proc;
}

export function sendInput(sessionId, data) {
  const s = sessions.get(sessionId);
  if (s?.proc?.stdin) s.proc.stdin.write(data);
}

export function killProcess(sessionId) {
  const s = sessions.get(sessionId);
  if (s?.proc) {
    s.proc.kill('SIGTERM');
    sessions.set(sessionId, { ...s, proc: null });
  }
}

export function listSessions() {
  return [...sessions.keys()];
}
