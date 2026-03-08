import { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket.js';
import Onboarding from './components/Onboarding.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import InputBar from './components/InputBar.jsx';
import SidePanel from './components/SidePanel.jsx';

export default function App() {
  const [messages, setMessages]             = useState([]);
  const [isStreaming, setIsStreaming]       = useState(false);
  const [fileTree, setFileTree]             = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [minimaxKey, setMinimaxKey]         = useState('');
  const [openrouterKey, setOpenrouterKey]   = useState('');
  const [workspacePath, setWorkspacePath]   = useState('');
  const [terminalData, setTerminalData]     = useState({ main: [], 'terminal-2': [], 'terminal-3': [] });
  const [browserData, setBrowserData]       = useState(null);
  const [previewPort, setPreviewPort]       = useState(null);
  const [connected, setConnected]           = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const send = useWebSocket(useCallback((msg) => {
    switch (msg.type) {
      case '_connected':    setConnected(true);  break;
      case '_disconnected': setConnected(false); break;

      case 'init':
        setFileTree(msg.fileTree || []);
        setWorkspacePath(msg.workspacePath || '');
        if (msg.hasMinimaxKey)    setMinimaxKey('saved');
        if (msg.hasOpenrouterKey) setOpenrouterKey('saved');
        if (!msg.hasMinimaxKey && !msg.hasOpenrouterKey) setShowOnboarding(true);
        break;

      case 'file_tree': setFileTree(msg.tree || []); break;

      case 'stream_start':
        setIsStreaming(true);
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, toolItems: [] }]);
        break;

      case 'stream_chunk':
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) next[next.length - 1] = { ...last, content: (last.content || '') + (msg.content || '') };
          return next;
        });
        break;

      case 'tool_call':
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) next[next.length - 1] = { ...last, toolItems: [...(last.toolItems || []), { type: 'tool_call', tool: msg.tool }] };
          return next;
        });
        break;

      case 'tool_result':
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) {
            const items = [...(last.toolItems || [])];
            const idx = items.map(i => i.type).lastIndexOf('tool_call');
            if (idx >= 0) items[idx] = { type: 'tool_result', result: msg.result, tool: items[idx].tool };
            else items.push({ type: 'tool_result', result: msg.result });
            next[next.length - 1] = { ...last, toolItems: items };
          }
          return next;
        });
        break;

      case 'browser_screenshot': setBrowserData(msg.data); break;

      case 'terminal_output': {
        const sid = msg.sessionId || 'main';
        setTerminalData(prev => ({ ...prev, [sid]: [...(prev[sid] || []).slice(-800), msg.data] }));
        break;
      }
      case 'terminal_exit': {
        const sid = msg.sessionId || 'main';
        setTerminalData(prev => ({ ...prev, [sid]: [...(prev[sid] || []), '\n[exit ' + msg.code + ']\n'] }));
        break;
      }

      case 'preview_port': setPreviewPort(msg.port); break;

      case 'model_switch':
        setActiveProvider(msg.model);
        setMessages(prev => [...prev, { role: 'system_notice', content: 'Switching to ' + (msg.model?.shortName || 'fallback') }]);
        break;

      case 'stream_end':
        setIsStreaming(false);
        if (msg.provider) setActiveProvider(msg.provider);
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) next[next.length - 1] = { ...last, streaming: false, provider: msg.provider };
          return next;
        });
        break;

      case 'conversation_cleared': setMessages([]); setActiveProvider(null); break;

      case 'error':
        setIsStreaming(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (msg.message || 'Unknown error'), streaming: false }]);
        break;
    }
  }, []));

  const handleSend = (text) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    send({ type: 'chat', message: text });
  };

  const handleTerminalCommand = (cmd, sessionId = 'main') => {
    setTerminalData(prev => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), '$ ' + cmd + '\n'] }));
    send({ type: 'terminal_command', command: cmd, sessionId });
  };

  const handleOnboardingDone = (key, type) => {
    if (type === 'minimax') { setMinimaxKey(key); send({ type: 'set_minimax_key', key }); }
    else { setOpenrouterKey(key); send({ type: 'set_openrouter_key', key }); }
    setShowOnboarding(false);
  };

  if (showOnboarding) return <Onboarding onDone={handleOnboardingDone} connected={connected} />;

  return (
    <div className="flex h-screen overflow-hidden relative">
      {!connected && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-[11px] font-semibold flex items-center gap-2"
             style={{ background: 'var(--bg-3)', border: '1px solid #ef444440', color: '#f87171' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
          Connecting...
        </div>
      )}

      <Sidebar
        fileTree={fileTree} activeProvider={activeProvider}
        minimaxKey={minimaxKey} openrouterKey={openrouterKey}
        onMinimaxKey={k => { setMinimaxKey(k); send({ type: 'set_minimax_key', key: k }); }}
        onOpenrouterKey={k => { setOpenrouterKey(k); send({ type: 'set_openrouter_key', key: k }); }}
        workspacePath={workspacePath}
        onClearConversation={() => send({ type: 'clear_conversation' })}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--border)] flex-shrink-0"
             style={{ background: 'var(--bg-1)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-[var(--text-2)]">Chat</span>
            {isStreaming && (
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent)]">
                <div className="flex gap-0.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} className="w-1 h-1 rounded-full"
                         style={{ background: 'var(--accent)', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
                Thinking...
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: connected ? '#34d399' : '#ef4444' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? '#34d399' : '#ef4444' }} />
            {connected ? 'Connected' : 'Offline'}
          </div>
        </div>
        <ChatPanel messages={messages} isStreaming={isStreaming} />
        <InputBar onSend={handleSend} disabled={isStreaming} workspacePath={workspacePath} />
      </div>

      <SidePanel
        terminalData={terminalData}
        onCommand={handleTerminalCommand}
        onKill={sid => send({ type: 'terminal_kill', sessionId: sid })}
        browserData={browserData}
        previewPort={previewPort}
        onPreviewPort={port => { setPreviewPort(port); send({ type: 'set_preview_port', port }); }}
      />
    </div>
  );
}
