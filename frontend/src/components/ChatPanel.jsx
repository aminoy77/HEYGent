import { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal, Globe, FileText, FolderPlus, Play,
         CheckCircle, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

const MODEL_COLORS = { MiniMax: '#06b6d4', Trinity: '#f472b6' };
const TOOL_ICONS   = { read_file: FileText, write_file: FileText, create_directory: FolderPlus, list_files: FolderPlus, run_command: Terminal, browser_search: Globe };
const TOOL_COLORS  = { read_file: '#9fa3c7', write_file: '#34d399', create_directory: '#fbbf24', list_files: '#9fa3c7', run_command: '#fb923c', browser_search: '#5eead4' };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(String(text || '')); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
      style={{ color: copied ? '#34d399' : 'var(--text-3)', background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
      {copied ? <Check size={11}/> : <Copy size={11}/>}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ lang, code }) {
  const safe = String(code == null ? '' : code).replace(/\n$/, '');
  return (
    <div className="relative my-2 rounded-lg overflow-hidden" style={{ background: '#080812', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider">{String(lang || 'code')}</span>
        <CopyButton text={safe}/>
      </div>
      <pre className="overflow-x-auto p-4 m-0" style={{ background: 'transparent' }}>
        <code className="text-[12px] font-mono leading-relaxed text-[#c9d1d9]">{safe}</code>
      </pre>
    </div>
  );
}

function renderLine(line, key) {
  const parts = String(line).split(/\*\*(.+?)\*\*/g);
  const nodes = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);
  if (line.startsWith('### ')) return <h3 key={key} className="text-[13px] font-bold text-[var(--text-1)] mt-3 mb-1">{parts.slice(1)}</h3>;
  if (line.startsWith('## '))  return <h2 key={key} className="text-[14px] font-bold text-[var(--text-1)] mt-3 mb-1">{line.slice(3)}</h2>;
  if (line.startsWith('# '))   return <h1 key={key} className="text-[15px] font-bold text-[var(--text-1)] mt-3 mb-1">{line.slice(2)}</h1>;
  if (line.startsWith('- ') || line.startsWith('* ')) return <div key={key} className="flex gap-2 text-[13px] text-[var(--text-2)] leading-relaxed"><span style={{color:'var(--accent)'}}>•</span><span>{nodes}</span></div>;
  if (line.trim() === '') return <div key={key} className="h-2"/>;
  return <div key={key} className="text-[13px] text-[var(--text-2)] leading-relaxed">{nodes}</div>;
}

function MixedContent({ content }) {
  if (!content) return null;
  const safe = String(content);
  const result = [];
  const segments = safe.split(/(```[\w]*\n[\s\S]*?```)/g);
  segments.forEach((seg, si) => {
    if (!seg) return;
    const m = seg.match(/^```([\w]*)\n([\s\S]*?)```$/);
    if (m) {
      result.push(<CodeBlock key={si} lang={m[1]} code={m[2]}/>);
    } else {
      String(seg).split('\n').forEach((line, li) => {
        result.push(renderLine(line, si + '-' + li));
      });
    }
  });
  return <>{result}</>;
}

function describeToolCall(name, args) {
  const n = String(name || '');
  const a = args || {};
  if (n === 'write_file')       return 'Creating ' + String(a.path || 'file');
  if (n === 'read_file')        return 'Reading '  + String(a.path || 'file');
  if (n === 'create_directory') return 'Creating folder ' + String(a.path || '');
  if (n === 'list_files')       return 'Exploring ' + String(a.path || 'workspace');
  if (n === 'run_command')      return 'Running: ' + String(a.command || '').substring(0, 60);
  if (n === 'browser_search')   return 'Searching: ' + String(a.query || a.url || '');
  return n || 'Working...';
}

function ToolBlock({ item }) {
  const [open, setOpen] = useState(false);
  if (!item) return null;
  const toolName = item?.tool?.name;
  const Icon  = TOOL_ICONS[toolName] || Play;
  const color = TOOL_COLORS[toolName] || '#9fa3c7';
  const isResult = item.type === 'tool_result';
  const label = describeToolCall(toolName, item?.tool?.args);
  const raw = isResult ? item?.result?.result : item?.tool?.args;
  const detail = raw == null ? '' : String(typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)).substring(0, 600);

  return (
    <div className="my-1 rounded-lg overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid ' + color + '40' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors">
        <Icon size={11} style={{ color }} className="flex-shrink-0 opacity-70"/>
        <span className="text-[12px] text-[var(--text-2)] flex-1 truncate">{label}</span>
        {isResult
          ? <CheckCircle size={10} style={{ color: '#34d399' }}/>
          : <div className="w-1.5 h-1.5 rounded-full spin" style={{ border: '1.5px solid ' + color, borderTopColor: 'transparent' }}/>}
        {detail && (open ? <ChevronDown size={10} className="text-[var(--text-3)]"/> : <ChevronRight size={10} className="text-[var(--text-3)]"/>)}
      </button>
      {open && detail && (
        <div className="px-3 pb-2 border-t border-[var(--border)]">
          <pre className="text-[10px] font-mono text-[var(--text-3)] whitespace-pre-wrap break-all leading-relaxed mt-2">{detail}</pre>
        </div>
      )}
    </div>
  );
}

function Message({ msg }) {
  if (!msg) return null;
  const isUser = msg.role === 'user';
  const providerName = String(msg?.provider?.shortName || msg?.provider?.name || '');
  const color = MODEL_COLORS[providerName] || '#5eead4';

  if (msg.role === 'system_notice') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full text-[10.5px] font-medium"
             style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
          {String(msg.content || '')}
        </div>
      </div>
    );
  }

  const toolItems = Array.isArray(msg.toolItems) ? msg.toolItems : [];

  return (
    <div className={'flex gap-3 ' + (isUser ? 'flex-row-reverse' : '')}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
           style={isUser
             ? { background: 'var(--bg-3)', border: '1px solid var(--border-bright)', color: 'var(--text-2)' }
             : { background: color + '20', border: '1px solid ' + color + '40', color }}>
        {isUser ? 'U' : '✦'}
      </div>

      <div className={'flex-1 max-w-[85%] flex flex-col gap-1 ' + (isUser ? 'items-end' : 'items-start')}>
        {!isUser && providerName && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{providerName}</span>
          </div>
        )}

        {toolItems.map((item, i) => <ToolBlock key={i} item={item}/>)}

        {(msg.content || msg.streaming) && (
          <div className={'w-full rounded-xl text-[13px] leading-relaxed ' + (isUser ? 'rounded-tr-sm' : 'rounded-tl-sm')}
               style={isUser
                 ? { background: 'var(--bg-3)', border: '1px solid var(--border-bright)', padding: '10px 14px' }
                 : { padding: '2px 0' }}>
            {isUser ? (
              <span className="whitespace-pre-wrap text-[var(--text-1)]">{String(msg.content || '')}</span>
            ) : (
              <div className="prose-dark relative group">
                <MixedContent content={msg.content}/>
                {msg.streaming && (
                  <div className="h-4 flex items-center gap-1 px-1 mt-1">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div key={i} className="w-1 h-1 rounded-full"
                           style={{ background: color, animation: 'blink 1.2s ease-in-out ' + d + 's infinite' }}/>
                    ))}
                  </div>
                )}
                {!msg.streaming && msg.content && (
                  <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={msg.content}/>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ messages }) {
  const bottomRef = useRef(null);
  const safeMessages = Array.isArray(messages) ? messages : [];
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [safeMessages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {safeMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <img src="/icon.png" alt="HEYgent" className="w-14 h-14 rounded-2xl mb-4 opacity-80"/>
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Ready to build</h2>
          <p className="text-[var(--text-3)] text-sm max-w-xs leading-relaxed">Dime qué quieres construir. Me encargo del resto.</p>
        </div>
      )}
      {safeMessages.map((msg, i) => <Message key={i} msg={msg}/>)}
      <div ref={bottomRef}/>
    </div>
  );
}
