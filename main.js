const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let backend, win;

function findNode() {
  const candidates = [
    '/Users/Arni/.nvm/versions/node/v24.13.0/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
  ];
  for (const p of candidates) {
    try { if (fs.statSync(p).isFile()) return p; } catch {}
  }
  return null;
}

function waitForBackend(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get('http://localhost:3001/api/info', () => resolve())
        .on('error', () => n <= 0 ? reject() : setTimeout(() => check(n - 1), 500));
    };
    check(retries);
  });
}

app.whenReady().then(async () => {
  try { require('child_process').execSync("lsof -ti:3001 | xargs kill -9 2>/dev/null || true", { shell: true }); } catch {}

  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
      const i = line.indexOf('=');
      if (i > 0 && !line.startsWith('#'))
        process.env[line.slice(0,i).trim()] = line.slice(i+1).trim();
    });
  }

  const nodePath = findNode();
  if (!nodePath) {
    dialog.showErrorBox('Error', 'Node.js no encontrado.');
    app.quit(); return;
  }

  backend = spawn(nodePath, [path.join(__dirname, 'backend/server.js')], {
    cwd: __dirname,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` },
    stdio: 'pipe'
  });
  backend.stdout.on('data', d => console.log('[be]', d.toString().trim()));
  backend.stderr.on('data', d => console.error('[be]', d.toString().trim()));
  backend.on('error', err => dialog.showErrorBox('Error backend', err.message));

  win = new BrowserWindow({ width: 1400, height: 900, titleBarStyle: 'hiddenInset' });
  win.loadURL('about:blank');

  try {
    await waitForBackend();
    win.loadURL('http://localhost:3001');
  } catch {
    dialog.showErrorBox('Error', 'Backend no respondió. Revisa que Node.js está instalado.');
  }
});

app.on('window-all-closed', () => { backend?.kill(); app.quit(); });
