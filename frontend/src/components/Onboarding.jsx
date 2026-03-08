import { useState } from 'react';

const PROVIDERS = [
  { id: 'minimax', name: 'MiniMax', desc: 'Modelo primario. Obtén tu key en ollama.com → Settings → API Keys', link: 'https://ollama.com/settings/api-keys', placeholder: 'ollama_...', color: '#06b6d4' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'Modelo alternativo gratuito. Obtén tu key en openrouter.ai/keys', link: 'https://openrouter.ai/keys', placeholder: 'sk-or-v1-...', color: '#f472b6' }
];

export default function Onboarding({ onDone, connected }) {
  const [selected, setSelected] = useState('minimax');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const active = PROVIDERS.find(p => p.id === selected);

  const submit = () => {
    if (!key.trim()) { setError('Introduce una API key'); return; }
    onDone(key.trim(), selected);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-10">
          <img src="/icon.png" alt="HEYgent" className="w-16 h-16 rounded-2xl mb-4 shadow-lg"/>
          <h1 className="text-2xl font-bold text-[var(--text-1)] tracking-tight">Bienvenido a HEYgent</h1>
          <p className="text-[var(--text-3)] text-sm mt-1">Añade una API key para empezar</p>
          {!connected && <p className="text-[10px] text-[#ef4444] mt-2">Conectando al backend...</p>}
        </div>

        <div className="flex gap-3 mb-6">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setSelected(p.id); setKey(''); setError(''); }}
              className="flex-1 py-3 px-4 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: selected === p.id ? p.color + '15' : 'var(--bg-2)', border: '1px solid ' + (selected === p.id ? p.color : 'var(--border)'), color: selected === p.id ? p.color : 'var(--text-3)' }}>
              {p.name}
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-6 border border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
          <p className="text-[12px] text-[var(--text-3)] mb-4 leading-relaxed">{active.desc}</p>
          <input type="password" placeholder={active.placeholder} value={key} autoFocus
            onChange={e => { setKey(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full bg-[var(--bg-3)] border border-[var(--border-bright)] rounded-xl px-4 py-3 text-[13px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none mb-2 focus:border-[var(--accent)]"/>
          {error && <p className="text-[11px] text-[#ff6b6b] mb-2">{error}</p>}
          <button onClick={submit} className="w-full py-3 rounded-xl text-[13px] font-bold mt-1"
            style={{ background: active.color, color: '#07070f' }}>
            Empezar →
          </button>
          <a href={active.link} target="_blank" rel="noreferrer"
             className="block text-center text-[11px] mt-3 hover:underline" style={{ color: active.color }}>
            ¿Dónde consigo la key? →
          </a>
        </div>
        <p className="text-center text-[11px] text-[var(--text-3)] mt-4">Puedes cambiar las keys en Settings ⚙️</p>
      </div>
    </div>
  );
}
