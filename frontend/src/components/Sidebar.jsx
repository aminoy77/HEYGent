import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Settings, Key, X, Trash2, Copy, Check } from 'lucide-react';

const FILE_ICONS = {
  js:'🟨',jsx:'⚛️',ts:'🔷',tsx:'⚛️',py:'🐍',rs:'🦀',go:'🐹',java:'☕',
  css:'🎨',html:'🌐',json:'📋',md:'📝',sh:'⚙️',yml:'⚙️',yaml:'⚙️',
  toml:'⚙️',txt:'📄',env:'🔑',gitignore:'🚫',dockerfile:'🐳',
};
function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || '📄';
}

function FileViewer({ file, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(file.content || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
         style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
           style={{ background: 'var(--bg-2)', border: '1px solid var(--border-bright)' }}
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
             style={{ background: 'var(--bg-3)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{getFileIcon(file.name)}</span>
            <span className="text-[13px] font-semibold text-[var(--text-1)]">{file.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-all"
              style={{ background: copied ? '#34d39920' : 'var(--bg-2)', color: copied ? '#34d399' : 'var(--text-3)', border: '1px solid var(--border)' }}>
              {copied ? <Check size={11}/> : <Copy size={11}/>}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-[var(--text-3)]">
              <X size={14}/>
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {file.loading ? (
            <div className="text-center py-8 text-[var(--text-3)] text-[12px]">Loading...</div>
          ) : file.error ? (
            <div className="text-[#ff6b6b] text-[12px]">{file.error}</div>
          ) : (
            <pre className="text-[12px] font-mono text-[#c9d1d9] leading-relaxed whitespace-pre-wrap break-all">
              {file.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth = 0, onFileClick }) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 12;

  if (node.type === 'directory') {
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-[3px] hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${8 + indent}px` }}>
          <span className="text-[var(--text-3)] w-3 flex-shrink-0">
            {open ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
          </span>
          {open
            ? <FolderOpen size={13} className="text-[var(--accent2)] flex-shrink-0"/>
            : <Folder size={13} className="text-[var(--accent2)] flex-shrink-0"/>}
          <span className="text-[var(--text-2)] text-[11.5px] truncate font-medium">{node.name}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNode key={child.path} node={child} depth={depth+1} onFileClick={onFileClick}/>
        ))}
      </div>
    );
  }

  return (
    <button onClick={() => onFileClick(node)}
      className="w-full flex items-center gap-1.5 px-2 py-[3px] hover:bg-white/5 rounded text-left transition-colors group"
      style={{ paddingLeft: `${8 + indent + 16}px` }}>
      <span className="text-[10px] w-3 text-center flex-shrink-0">{getFileIcon(node.name)}</span>
      <span className="text-[var(--text-3)] text-[11px] truncate group-hover:text-[var(--text-2)] transition-colors">{node.name}</span>
    </button>
  );
}

export default function Sidebar({ fileTree, activeProvider, minimaxKey, openrouterKey,
  onMinimaxKey, onOpenrouterKey, workspacePath, onClearConversation }) {
  const [showSettings, setShowSettings] = useState(!minimaxKey && !openrouterKey);
  const [mmInput, setMmInput] = useState('');
  const [orInput, setOrInput] = useState('');
  const [openFile, setOpenFile] = useState(null);

  const handleSaveMinimax = () => { if (mmInput.trim()) { onMinimaxKey(mmInput.trim()); setMmInput(''); } };
  const handleSaveOpenrouter = () => { if (orInput.trim()) { onOpenrouterKey(orInput.trim()); setOrInput(''); } };

  const handleFileClick = async (node) => {
    setOpenFile({ name: node.name, path: node.path, loading: true });
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { content } = await res.json();
      setOpenFile({ name: node.name, path: node.path, content });
    } catch (err) {
      setOpenFile({ name: node.name, path: node.path, error: err.message });
    }
  };

  return (
    <div className="flex flex-col h-full w-[220px] flex-shrink-0 border-r border-[var(--border)] relative"
         style={{ background: 'var(--bg-1)' }}>

      {/* Logo */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2.5">
        <img src="/icon.png" alt="HEYgent" className="w-6 h-6 rounded-md object-cover" />
        <span className="font-bold text-sm tracking-tight text-[var(--text-1)]">HEYgent</span>
        {activeProvider && (
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                 style={{ background: activeProvider?.color || '#5eead4' }} />
            <span className="text-[9px] text-[var(--text-3)] truncate max-w-[60px]">
              {activeProvider?.shortName || ''}
            </span>
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-3)] px-2 mb-1">Workspace</div>
        {fileTree.length === 0 ? (
          <div className="px-3 py-4 text-center text-[var(--text-3)] text-[11px]">
            <Folder size={18} className="mx-auto mb-1.5 opacity-30"/>
            Workspace empty
          </div>
        ) : fileTree.map(node => (
          <TreeNode key={node.path} node={node} onFileClick={handleFileClick}/>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <button onClick={onClearConversation}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-white/5 transition-colors flex-1">
          <Trash2 size={12}/> Clear
        </button>
        <button onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded hover:bg-white/5 text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
          <Settings size={14}/>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-14 left-3 right-3 p-3 rounded-xl border border-[var(--border-bright)] anim-in z-50"
             style={{ background: 'var(--bg-3)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-[var(--text-1)] flex items-center gap-1.5">
              <Key size={11}/> API Keys
            </span>
            <button onClick={() => setShowSettings(false)}><X size={13} className="text-[var(--text-3)]"/></button>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-3)]">MiniMax (primary)</span>
              {minimaxKey && <span className="text-[9px] text-[#34d399]">✓ active</span>}
            </div>
            <div className="flex gap-1">
              <input type="password" placeholder="ollama api key..." value={mmInput}
                onChange={e => setMmInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveMinimax()}
                className="flex-1 bg-[var(--bg-1)] border border-[var(--border-bright)] rounded px-2 py-1 text-[10.5px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[#06b6d4] font-mono"/>
              <button onClick={handleSaveMinimax} className="px-2 py-1 rounded text-[10px] font-semibold"
                style={{ background: '#06b6d4', color: '#07070f' }}>Save</button>
            </div>
            <div className="text-[9px] text-[var(--text-3)] mt-0.5">ollama.com → Settings → API Keys</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-3)]">OpenRouter (fallback)</span>
              {openrouterKey && <span className="text-[9px] text-[#34d399]">✓ active</span>}
            </div>
            <div className="flex gap-1">
              <input type="password" placeholder="sk-or-v1-..." value={orInput}
                onChange={e => setOrInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveOpenrouter()}
                className="flex-1 bg-[var(--bg-1)] border border-[var(--border-bright)] rounded px-2 py-1 text-[10.5px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[#f472b6] font-mono"/>
              <button onClick={handleSaveOpenrouter} className="px-2 py-1 rounded text-[10px] font-semibold"
                style={{ background: '#f472b6', color: '#07070f' }}>Save</button>
            </div>
            <div className="text-[9px] text-[var(--text-3)] mt-0.5">openrouter.ai → Keys</div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {openFile && <FileViewer file={openFile} onClose={() => setOpenFile(null)}/>}
    </div>
  );
}
