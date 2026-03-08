import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

export default function InputBar({ onSend, disabled, workspacePath }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const submit = () => {
    const msg = text.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setText('');
    ref.current.style.height = 'auto';
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const handleInput = e => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  return (
    <div className="px-4 py-3 border-t border-[var(--border)]" style={{ background: 'var(--bg-1)' }}>
      <div className="rounded-xl border border-[var(--border-bright)] overflow-hidden transition-all focus-within:border-[var(--accent)]"
           style={{ background: 'var(--bg-2)' }}>
        <textarea
          ref={ref}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Ask me to build something..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-4 pt-3 pb-1 text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] resize-none outline-none leading-relaxed"
          style={{ minHeight: '44px', maxHeight: '180px' }}
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {workspacePath && (
            <span className="text-[10px] text-[var(--text-3)] font-mono truncate max-w-[200px]" title={workspacePath}>
              {workspacePath.split('/').slice(-2).join('/')}
            </span>
          )}
          <div className="ml-auto">
            <button
              onClick={submit}
              disabled={disabled || !text.trim()}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={text.trim() && !disabled
                ? { background: 'var(--accent)', color: '#07070f' }
                : { background: 'var(--bg-3)', color: 'var(--text-3)' }}
            >
              {disabled
                ? <div className="w-3 h-3 rounded-full spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
                : <Send size={13} />}
            </button>
          </div>
        </div>
      </div>
      <div className="text-center mt-1.5 text-[9.5px] text-[var(--text-3)]">
        Enter to send · Shift+Enter new line
      </div>
    </div>
  );
}
