import fs from 'fs/promises';
import path from 'path';

let WORKSPACE_ROOT = null;

export function initFilesystem(workspacePath) {
  WORKSPACE_ROOT = path.resolve(workspacePath);
}

function safePath(filePath) {
  const resolved = path.resolve(WORKSPACE_ROOT, filePath);
  if (!resolved.startsWith(WORKSPACE_ROOT + path.sep) && resolved !== WORKSPACE_ROOT) {
    throw new Error(`Access denied: "${filePath}" is outside workspace`);
  }
  return resolved;
}

export const filesystemTools = {
  async read_file({ path: p }) {
    const content = await fs.readFile(safePath(p), 'utf-8');
    return content;
  },
  async write_file({ path: p, content }) {
    const abs = safePath(p);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    return `✓ File written: ${p} (${content.length} chars)`;
  },
  async create_directory({ path: p }) {
    await fs.mkdir(safePath(p), { recursive: true });
    return `✓ Directory created: ${p}`;
  },
  async list_files({ path: p = '.' }) {
    const entries = await fs.readdir(safePath(p), { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      path: path.join(p, e.name)
    }));
  },
  async delete_file({ path: p }) {
    await fs.unlink(safePath(p));
    return `✓ Deleted: ${p}`;
  },
  async move_file({ from: src, to: dst }) {
    const absDst = safePath(dst);
    await fs.mkdir(path.dirname(absDst), { recursive: true });
    await fs.rename(safePath(src), absDst);
    return `✓ Moved: ${src} → ${dst}`;
  }
};

export async function getFileTree(dirPath, depth = 0) {
  if (!WORKSPACE_ROOT) return [];
  const root = dirPath || WORKSPACE_ROOT;
  if (depth > 5) return [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const tree = [];
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__pycache__') continue;
      const full = path.join(root, e.name);
      const rel = path.relative(WORKSPACE_ROOT, full);
      if (e.isDirectory()) {
        const children = await getFileTree(full, depth + 1);
        tree.push({ name: e.name, type: 'directory', path: rel, children });
      } else {
        const stat = await fs.stat(full);
        tree.push({ name: e.name, type: 'file', path: rel, size: stat.size });
      }
    }
    return tree.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch { return []; }
}
