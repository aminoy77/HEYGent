import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Globe, Plus, X, RefreshCw, ExternalLink, ChevronRight, Maximize2 } from 'lucide-react';

// ANSI → HTML (basic colors)
function ansiToHtml(text) {
  const C = { '30':'#4a4a5a','31':'#ff6b6b','32':'#5eead4','33':'#fbbf24',
              '34':'#60a5fa','35':'#c084fc','36':'#22d3ee','37':'#e8eaf6',
              '90':'#6b7280','91':'#f87171','92':'#34d399','93':'#fcd34d',
              '94':'#818cf8','95':'#e879f9','96':'#38bdf8','97':'#f8fafc' };
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\x1b\[([0-9;]*)m/g, (_, codes) => {
      if (!codes || codes === '0') return '</span>';
      const parts = codes.split(';');
      const col = parts.find(p => C[p]);
      const bold = parts.includes('1');
      return col ? `<span style="color:${C[col]};${bold?'font-weight:600':''}">` : '';
    });
}

const DEFAULT_TABS = [
  { id: 'main',       label: 'Main',       sessionId: 'main'       },
  { id: 'terminal-2', label: 'Terminal 2', sessionId: 'terminal-2' },
  { id: 'terminal-3', label: 'Terminal 3', sessionId: 'terminal-3' },
];

function TerminalTab({ tab, lines, onCommand, onKill, active }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const submit = () => {
    if (!input.trim()) return;
    onCommand(input.trim(), tab.sessionId);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 terminal-output text-[var(--text-2)] text-[11.5px]"
        style={{ background: 'var(--bg-0)' }}
      >
        {lines.length === 0 ? (
          <div className="text-[var(--text-3)] text-[11px] mt-4 text-center opacity-50">
            {tab.label} ready — type a command
          </div>
        ) : lines.map((line, i) => (
          <span key={i} dangerouslySetInnerHTML={{ __html: ansiToHtml(line) }} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-[var(--border)] flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-bright)]"
             style={{ background: 'var(--bg-2)' }}>
          <ChevronRight size={11} className="text-[var(--accent)] flex-shrink-0" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="$ command..."
            className="flex-1 bg-transparent text-[11.5px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none"
          />
        </div>
        <button onClick={() => onKill(tab.sessionId)} title="Kill process"
                className="px-2 rounded text-[10px] hover:bg-white/5 text-[var(--text-3)] hover:text-[#ff6b6b] transition-colors border border-[var(--border)]">
          ■
        </button>
      </div>
    </div>
  );
}

function PreviewPanel({ previewPort, onPortChange }) {
  const [port, setPort] = useState(previewPort || '');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (previewPort) {
      setPort(String(previewPort));
      setUrl(`http://localhost:${previewPort}`);
    }
  }, [previewPort]);

  const navigate = (targetUrl) => {
    setLoading(true);
    setUrl(targetUrl);
  };

  const applyPort = () => {
    if (port) {
      const target = `http://localhost:${port}`;
      onPortChange(parseInt(port));
      navigate(target);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL/Port bar */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-[var(--border)]"
           style={{ background: 'var(--bg-2)' }}>
        <span className="text-[10px] text-[var(--text-3)] flex-shrink-0">Port:</span>
        <input
          value={port}
          onChange={e => setPort(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyPort()}
          placeholder="3000"
          className="w-16 bg-[var(--bg-3)] border border-[var(--border-bright)] rounded px-2 py-0.5 text-[11px] font-mono text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
        />
        <button onClick={applyPort}
                className="px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 transition-colors"
                style={{ background: 'var(--accent)', color: '#07070f' }}>
          Go
        </button>
        {url && <>
          <button onClick={() => { if (iframeRef.current) iframeRef.current.src = url; }}
                  title="Refresh" className="p-1 rounded hover:bg-white/5 text-[var(--text-3)] transition-colors">
            <RefreshCw size={11} />
          </button>
          <a href={url} target="_blank" rel="noreferrer" title="Open in browser"
             className="p-1 rounded hover:bg-white/5 text-[var(--text-3)] transition-colors">
            <ExternalLink size={11} />
          </a>
          <span className="text-[9px] text-[var(--text-3)] truncate flex-1 font-mono">{url}</span>
        </>}
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative" style={{ background: '#fff' }}>
        {!url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
               style={{ background: 'var(--bg-0)' }}>
            <Globe size={28} className="mb-3 text-[var(--text-3)] opacity-30" />
            <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
              Run a web app in a terminal,<br/>then enter its port here to preview it.
            </p>
            <div className="mt-3 text-[10px] text-[var(--text-3)] opacity-60">
              e.g. <span className="font-mono text-[var(--accent)]">npm run dev</span> → port 5173
            </div>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10"
                   style={{ background: 'var(--bg-0)' }}>
                <div className="w-5 h-5 rounded-full spin"
                     style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function SidePanel({ terminalData, onCommand, onKill, browserData, previewPort, onPreviewPort }) {
  const [activeTab, setActiveTab] = useState('main');
  const [tabs] = useState(DEFAULT_TABS);

  // Switch to browser tab automatically when screenshot arrives
  useEffect(() => {
    if (browserData) setActiveTab('browser');
  }, [browserData]);

  // Switch to preview when port is set
  useEffect(() => {
    if (previewPort) setActiveTab('preview');
  }, [previewPort]);

  const allTabs = [
    ...tabs.map(t => ({ ...t, type: 'terminal' })),
    { id: 'browser', label: 'Browser', type: 'browser' },
    { id: 'preview', label: 'Preview', type: 'preview' },
  ];

  return (
    <div className="flex flex-col h-full w-[340px] flex-shrink-0 border-l border-[var(--border)]"
         style={{ background: 'var(--bg-1)' }}>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-[var(--border)] flex-shrink-0"
           style={{ scrollbarWidth: 'none' }}>
        {allTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const hasDot = (tab.id === 'browser' && browserData) || (tab.id === 'preview' && previewPort);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1 px-3 py-2.5 text-[10.5px] font-medium transition-colors whitespace-nowrap border-b-2 flex-shrink-0"
              style={{
                borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                background: isActive ? 'rgba(94,234,212,0.05)' : 'transparent'
              }}
            >
              {tab.type === 'terminal' && <Terminal size={10} />}
              {tab.type === 'browser'  && <Globe size={10} />}
              {tab.type === 'preview'  && <Maximize2 size={10} />}
              {tab.label}
              {hasDot && <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />}
            </button>
          );
        })}
      </div>

      {/* Terminal tabs */}
      {tabs.map(tab => (
        <div key={tab.id} className="flex-1 overflow-hidden"
             style={{ display: activeTab === tab.id ? 'flex' : 'none', flexDirection: 'column' }}>
          <TerminalTab
            tab={tab}
            lines={terminalData[tab.sessionId] || []}
            onCommand={onCommand}
            onKill={onKill}
            active={activeTab === tab.id}
          />
        </div>
      ))}

      {/* Browser tab */}
      {activeTab === 'browser' && (
        <div className="flex-1 overflow-y-auto">
          {!browserData ? (
            <div className="p-6 text-center">
              <Globe size={24} className="mx-auto mb-2 text-[var(--text-3)] opacity-30" />
              <p className="text-[11px] text-[var(--text-3)]">Browser activates when AI searches the web</p>
            </div>
          ) : (
            <div>
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <div className="text-[9px] text-[var(--text-3)] truncate font-mono">{browserData.url}</div>
                <div className="text-[11px] text-[var(--text-2)] font-medium truncate">{browserData.title}</div>
              </div>
              {browserData.screenshot && (
                <img src={`data:image/jpeg;base64,${browserData.screenshot}`}
                     alt="Browser" className="w-full border-b border-[var(--border)]" />
              )}
              {browserData.content && (
                <div className="p-3 text-[11px] text-[var(--text-3)] leading-relaxed font-mono whitespace-pre-wrap">
                  {browserData.content.substring(0, 1500)}...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview tab */}
      {activeTab === 'preview' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <PreviewPanel previewPort={previewPort} onPortChange={onPreviewPort} />
        </div>
      )}
    </div>
  );
}
