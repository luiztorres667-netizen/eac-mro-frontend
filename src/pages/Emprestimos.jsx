import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs }                               from 'firebase/firestore';
import { db }                                                 from '../firebase';
import { useAuth }                                            from '../contexts/AuthContext';
import { usePedidos }                                         from '../hooks/usePedidos';
import { api, usuariosApi }                                   from '../api';
import { CONTEUDOS }                                          from '../data/conteudos';

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const STATUS_LABEL = {
  pendente:               'Aguardando aprovação',
  aprovado:               'Aprovado / Liberado',
  aguardando_devolucao:   'Aguard. confirmação devolução',
  devolvido:              'Devolvido',
  cancelado:              'Cancelado',
  recusado:               'Recusado',
};

function statusBadgeCls(s) {
  const map = {
    pendente:              'status-pendente',
    aprovado:              'status-aprovado',
    aguardando_devolucao:  'status-aguardando_devolucao',
    devolvido:             'status-devolvido',
    cancelado:             'status-cancelado',
    recusado:              'status-recusado',
  };
  return `status-badge ${map[s] || ''}`;
}

function parseDate(val) {
  if (!val) return null;
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds  !== undefined) return new Date(val.seconds  * 1000);
  if (typeof val === 'string') return new Date(val.length === 10 ? val + 'T00:00:00' : val);
  return new Date(val);
}

function fmtData(val) {
  if (!val) return '—';
  try {
    const d = parseDate(val);
    if (!d || isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch { return '—'; }
}

function diasRestantes(devVal) {
  if (!devVal) return null;
  const dev = parseDate(devVal);
  if (!dev || isNaN(dev)) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  dev.setHours(0,0,0,0);
  return Math.round((dev - hoje) / 86400000);
}

// Extrai solicitante e concedente de um pedido,
// suportando tanto o formato legado (solicitanteNome/Email)
// quanto o formato novo (solicitante/concedente como strings)
function getPartes(p) {
  const solNome  = p.solicitanteNome  || p.nomeSolicitanteForm || p.solicitante  || p.criadoPorNome || '—';
  const solEmail = p.solicitanteEmail || '';
  const conNome  = p.concedenteNome   || p.nomeResponsavel     || p.concedente   || '—';
  const conEmail = p.concedenteEmail  || '';
  return {
    sol: { nome: solNome, email: solEmail },
    con: { nome: conNome, email: conEmail },
  };
}

/* ══════════════════════════════════════
   HOOK: PRODUTOS DO FIRESTORE
══════════════════════════════════════ */
function useProdutos() {
  const [produtos, setProdutos] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'produtos'))
      .then(snap => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.ativo !== false && p.nome)
          .sort((a, b) => a.nome.localeCompare(b.nome));
        setProdutos(lista);
      })
      .catch(() => { /* sem acesso ao Firestore, sem sugestões */ });
  }, []);
  return produtos;
}

/* ══════════════════════════════════════
   HOOK: USUÁRIOS
══════════════════════════════════════ */
function useUsuariosLista() {
  const [usuarios, setUsuarios] = useState([]);
  useEffect(() => {
    usuariosApi.listar()
      .then(lista => setUsuarios(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }, []);
  return usuarios;
}

/* ══════════════════════════════════════
   COMPONENTE: USER SEARCH (MENCAO)
══════════════════════════════════════ */
function UserSearch({ value, onChange, usuarios, placeholder }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const inputRef = useRef();

  const filtered = query.length >= 1
    ? usuarios.filter(u =>
        (u.nome       || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.email      || '').toLowerCase().includes(query.toLowerCase()) ||
        (u.matricula  || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  function select(u) {
    onChange({ nome: u.nome, email: u.email, matricula: u.matricula, id: u.id });
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (value) {
    return (
      <div className="mencao-chip-selected">
        <div className="mencao-chip-avatar">{(value.nome || '?')[0].toUpperCase()}</div>
        <div className="mencao-chip-body">
          <div className="mencao-chip-nome">{value.nome || '—'}</div>
          {value.email     && <div className="mencao-chip-email">{value.email}</div>}
          {value.matricula && <div className="mencao-chip-email">{value.matricula}</div>}
        </div>
        <button type="button" className="mencao-chip-clear" onClick={clear} title="Remover">✕</button>
      </div>
    );
  }

  return (
    <div className="mencao-wrap">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder || 'Nome, e-mail ou matrícula…'}
      />
      {open && filtered.length > 0 && (
        <div className="mencao-dropdown">
          {filtered.map(u => (
            <div key={u.id || u.email} className="mencao-item" onMouseDown={() => select(u)}>
              <div className="mencao-item-avatar">{(u.nome || '?')[0].toUpperCase()}</div>
              <div className="mencao-item-body">
                <div className="mencao-item-nome">{u.nome}</div>
                <div className="mencao-item-sub">
                  {u.email}{u.matricula ? ` · ${u.matricula}` : ''}
                </div>
              </div>
              {u.cargo && <div className="mencao-item-cargo">{u.cargo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   COMPONENTE: PRODUCT AUTOCOMPLETE
   – Combina CSV (CONTEUDOS) + Firestore
   – Só mostra predições quando há texto
   – Navegação por teclado ↑↓ Enter Esc
══════════════════════════════════════ */
function ProductAutocomplete({ value, onChange, produtos, placeholder }) {
  const [open, setOpen] = useState(false);
  const [idx,  setIdx]  = useState(-1);

  // Mescla nomes do Firestore com os do CSV, sem duplicatas
  const allNomes = useMemo(() => {
    const fromFS = produtos.map(p => p.nome).filter(Boolean);
    return [...new Set([...fromFS, ...CONTEUDOS])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [produtos]);

  const q = (value || '').trim();

  // REGRA-CHAVE: nada aparece se o campo estiver vazio
  const filtered = useMemo(() => {
    if (!open || !q) return [];
    const lower = q.toLowerCase();
    return allNomes.filter(n => n.toLowerCase().includes(lower)).slice(0, 10);
  }, [open, q, allNomes]);

  function select(nome) {
    onChange(nome);
    setOpen(false);
    setIdx(-1);
  }

  function handleChange(e) {
    const v = e.target.value;
    onChange(v);
    setIdx(-1);
    // Abre só se tiver texto; fecha imediatamente se apagar tudo
    setOpen(!!v.trim());
  }

  function handleFocus() {
    if (q) setOpen(true);  // Não abre se vazio
  }

  function handleKeyDown(e) {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); select(filtered[idx]); }
    else if (e.key === 'Escape')     { setOpen(false); setIdx(-1); }
  }

  return (
    <div className="produto-autocomplete">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => { setOpen(false); setIdx(-1); }, 180)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Buscar conteúdo…'}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="produto-dropdown">
          {filtered.map((nome, i) => (
            <div
              key={i}
              className={`produto-item${i === idx ? ' selected' : ''}`}
              onMouseDown={() => select(nome)}
              onMouseEnter={() => setIdx(i)}
            >
              {/* Destaca o trecho que bate com a busca */}
              <HighlightMatch text={nome} query={q} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Destaca parte do texto que bate com a query ── */
function HighlightMatch({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(0,206,124,.25)', color: 'var(--verde)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ══════════════════════════════════════
   COMPONENTE: SEARCH AUTOCOMPLETE
   – Barra de busca principal com predição
   – Só mostra quando há texto digitado
══════════════════════════════════════ */
function SearchAutocomplete({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [idx,  setIdx]  = useState(-1);

  const q = (value || '').trim();

  const filtered = useMemo(() => {
    if (!open || !q) return [];
    const lower = q.toLowerCase();
    return CONTEUDOS.filter(n => n.toLowerCase().includes(lower)).slice(0, 8);
  }, [open, q]);

  function select(nome) {
    onChange(nome);
    setOpen(false);
    setIdx(-1);
  }

  function handleChange(e) {
    const v = e.target.value;
    onChange(v);
    setIdx(-1);
    setOpen(!!v.trim());
  }

  function handleKeyDown(e) {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); select(filtered[idx]); }
    else if (e.key === 'Escape')     { setOpen(false); setIdx(-1); onChange(''); }
  }

  return (
    <div className="busca-autocomplete">
      <div className="busca-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="busca-input"
          type="text"
          placeholder={placeholder || 'Buscar por produto, nome, e-mail ou código…'}
          value={value}
          onChange={handleChange}
          onFocus={() => { if (q) setOpen(true); }}
          onBlur={() => setTimeout(() => { setOpen(false); setIdx(-1); }, 180)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 6px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            title="Limpar busca"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="busca-dropdown">
          {filtered.map((nome, i) => (
            <div
              key={i}
              className={`busca-item${i === idx ? ' selected' : ''}`}
              onMouseDown={() => select(nome)}
              onMouseEnter={() => setIdx(i)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .5 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <HighlightMatch text={nome} query={q} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   PEDIDO CARD
══════════════════════════════════════ */
function PedidoCard({ p, onDetalhe, onAprovar, onRecusar, onDevolver, onEstender, perm, userEmail }) {
  const dias  = diasRestantes(p.devISO);
  const { sol, con } = getPartes(p);

  const isMeSol = userEmail && sol.email && sol.email.toLowerCase() === userEmail.toLowerCase();
  const isMeCon = userEmail && con.email && con.email.toLowerCase() === userEmail.toLowerCase();

  return (
    <div className={`pedido-card ${p.status || ''}`}>
      {/* Topo: título + badge */}
      <div className="pedido-top">
        <div>
          <div className="pedido-titulo">
            {p.produto || 'Sem título'}
            {p.numeroPedido && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 8 }}>
                #{p.numeroPedido}
              </span>
            )}
          </div>

          {/* Chips solicitante → concedente com email */}
          <div className="pedido-partes">
            <div className="parte-chip-wrap">
              <span className={`parte-chip${isMeSol ? ' eu' : ''}`}>{sol.nome}</span>
              {sol.email && <span className="parte-chip-email">{sol.email}</span>}
            </div>
            <span className="arrow">→</span>
            <div className="parte-chip-wrap">
              <span className={`parte-chip${isMeCon ? ' eu' : ''}`}>{con.nome}</span>
              {con.email && <span className="parte-chip-email">{con.email}</span>}
            </div>
            {p.mgSolicitante && (
              <span className="parte-chip" style={{ color: 'var(--indigo)', borderColor: 'var(--indigo)' }}>
                {p.mgSolicitante}
              </span>
            )}
            {p.mgConcedente && (
              <span className="parte-chip" style={{ color: 'var(--verde)', borderColor: 'var(--verde)' }}>
                {p.mgConcedente}
              </span>
            )}
          </div>
        </div>

        <span className={statusBadgeCls(p.status)}>
          {p.status === 'pendente'             && '⏳ '}
          {p.status === 'aprovado'             && '✅ '}
          {p.status === 'devolvido'            && '↩ '}
          {p.status === 'recusado'             && '✕ '}
          {p.status === 'aguardando_devolucao' && '🔄 '}
          {STATUS_LABEL[p.status] || p.status}
        </span>
      </div>

      {/* Grid de informações */}
      <div className="pedido-info">
        <div>
          <div className="info-label">Criado em</div>
          <div className="info-value">
            {fmtData(p.criadoEm?.toDate ? p.criadoEm.toDate().toISOString().slice(0,10) : p.criadoEm)}
          </div>
        </div>
        {p.devISO && (
          <div>
            <div className="info-label">Devolução</div>
            <div className={`info-value ${dias !== null && dias < 0 ? 'err' : dias !== null && dias <= 3 ? 'warn' : 'ok'}`}>
              {fmtData(p.devISO)}
              {dias !== null && (
                <span style={{ fontSize: 10, marginLeft: 4 }}>
                  ({dias < 0 ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'hoje' : `${dias}d`})
                </span>
              )}
            </div>
          </div>
        )}
        {p.produtoConcedente && (
          <div>
            <div className="info-label">Prod. Concedente</div>
            <div className="info-value" style={{ fontSize: 11 }}>{p.produtoConcedente}</div>
          </div>
        )}
        {p.localizacao && (
          <div>
            <div className="info-label">Localização</div>
            <div className="info-value" style={{ fontSize: 11 }}>{p.localizacao}</div>
          </div>
        )}
      </div>

      {/* Materiais */}
      {(() => {
        const mat = Array.isArray(p.materiais) ? p.materiais
                  : Array.isArray(p.itens)     ? p.itens
                  : [];
        return mat.length > 0 ? (
          <div className="pedido-materiais">
            📦 {mat.join(' · ')}
          </div>
        ) : null;
      })()}

      {/* Ocorrência */}
      {p.ocorrencia?.tipo && (
        <div className="ocorrencia-box">
          ⚠️ Ocorrência: {p.ocorrencia.tipo}
          {p.ocorrencia.descricao && ` — ${p.ocorrencia.descricao}`}
        </div>
      )}

      {/* Ações */}
      <div className="pedido-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onDetalhe(p)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Ver detalhes
        </button>

        {perm('eac_aprovar') && p.status === 'pendente' && <>
          <button className="btn btn-green btn-sm" onClick={() => onAprovar(p)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Aprovar
          </button>
          <button className="btn btn-red btn-sm" onClick={() => onRecusar(p)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Recusar
          </button>
        </>}

        {perm('eac_devolver') && ['aprovado','aguardando_devolucao'].includes(p.status) && (
          <button className="btn btn-amber btn-sm" onClick={() => onDevolver(p)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
            Devolver
          </button>
        )}

        {perm('eac_estender') && p.status === 'aprovado' && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEstender(p)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Estender
          </button>
        )}

        {dias !== null && dias < 0 && p.status === 'aprovado' && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚠️ {Math.abs(dias)}d em atraso
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL NOVO PEDIDO
══════════════════════════════════════ */
function ModalNovoPedido({ onClose, onSalvo }) {
  const { user } = useAuth();
  const usuarios = useUsuariosLista();
  const produtos = useProdutos();

  const [saving,   setSaving]   = useState(false);
  const [materiais, setMateriais] = useState(['']);

  // Solicitante e concedente como objetos (mencao widget)
  const [solicitanteObj, setSolicitanteObj] = useState(
    user ? { nome: user.nome || user.email, email: user.email, matricula: user.matricula } : null
  );
  const [concedenteObj, setConcedenteObj] = useState(null);

  const [form, setForm] = useState({
    numeroPedido:    '',
    produto:         '',
    produtoConcedente: '',
    mgSolicitante:   '',
    mgConcedente:    '',
    inicioISO:       '',
    devISO:          '',
    observacao:      '',
    tipo:            'Empréstimo',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function addMaterial()     { setMateriais(m => [...m, '']); }
  function setMaterial(i, v) { setMateriais(m => m.map((x, j) => j === i ? v : x)); }
  function removeMaterial(i) { setMateriais(m => m.filter((_, j) => j !== i)); }

  async function salvar() {
    if (!form.produto.trim()) { alert('Informe o produto solicitante.'); return; }
    if (!solicitanteObj)      { alert('Informe o solicitante.');         return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Campos legado + novo formato para compatibilidade total
        solicitante:       solicitanteObj?.nome  || '',
        concedente:        concedenteObj?.nome   || '',
        solicitanteNome:   solicitanteObj?.nome  || '',
        solicitanteEmail:  solicitanteObj?.email || '',
        nomeSolicitanteForm: solicitanteObj?.nome || '',
        concedenteNome:    concedenteObj?.nome   || '',
        concedenteEmail:   concedenteObj?.email  || '',
        nomeResponsavel:   concedenteObj?.nome   || '',
        materiais: materiais.filter(m => m.trim()),
        criadoPor:         user?.uid,
        criadoPorNome:     user?.nome || user?.email,
        status: 'pendente',
      };
      await api.post('/pedidos', payload);
      onSalvo?.();
      onClose();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const diasDuracao = (() => {
    if (!form.devISO) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dev  = new Date(form.devISO + 'T00:00:00');
    const d = Math.round((dev - hoje) / 86400000);
    return d > 0 ? d : null;
  })();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Novo pedido de Empréstimo</h3>
          <div className="modal-header-right">
            <span className="modal-badge verde">{form.tipo}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Número do pedido */}
          <div className="field">
            <label>Número do pedido <span className="opcional">(opcional)</span></label>
            <input type="text" value={form.numeroPedido} onChange={e => set('numeroPedido', e.target.value)} placeholder="Ex: 0001, OS-4521…" />
          </div>

          {/* Solicitante + Concedente — mencao widget */}
          <div className="field-row">
            <div className="field">
              <label>Solicitante</label>
              <UserSearch
                value={solicitanteObj}
                onChange={setSolicitanteObj}
                usuarios={usuarios}
                placeholder="Buscar solicitante…"
              />
            </div>
            <div className="field">
              <label>Concedente <span className="opcional">(opcional)</span></label>
              <UserSearch
                value={concedenteObj}
                onChange={setConcedenteObj}
                usuarios={usuarios}
                placeholder="Buscar concedente…"
              />
            </div>
          </div>

          {/* Produto solicitante + MG */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Produto Solicitante</span>
              <select
                value={form.mgSolicitante}
                onChange={e => set('mgSolicitante', e.target.value)}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 99, color: form.mgSolicitante ? 'var(--verde)' : 'var(--muted)', fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
              >
                <option value="">MG</option>
                <option value="MG1">MG1</option>
                <option value="MG2">MG2</option>
                <option value="MG3">MG3</option>
                <option value="MG4">MG4</option>
                <option value="Cenografia">Cenografia</option>
                <option value="Arte">Arte</option>
              </select>
            </label>
            <ProductAutocomplete
              value={form.produto}
              onChange={v => set('produto', v)}
              produtos={produtos}
              placeholder="Buscar ou digitar produto solicitante…"
            />
          </div>

          {/* Produto concedente + MG */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Produto Concedente <span className="opcional">(opcional)</span></span>
              <select
                value={form.mgConcedente}
                onChange={e => set('mgConcedente', e.target.value)}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 99, color: form.mgConcedente ? 'var(--verde)' : 'var(--muted)', fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
              >
                <option value="">MG</option>
                <option value="MG1">MG1</option>
                <option value="MG2">MG2</option>
                <option value="MG3">MG3</option>
                <option value="MG4">MG4</option>
                <option value="Cenografia">Cenografia</option>
                <option value="Arte">Arte</option>
              </select>
            </label>
            <ProductAutocomplete
              value={form.produtoConcedente}
              onChange={v => set('produtoConcedente', v)}
              produtos={produtos}
              placeholder="Identificação/código do concedente…"
            />
          </div>

          {/* Datas */}
          <div className="field-row">
            <div className="field">
              <label>Data de início</label>
              <input type="date" value={form.inicioISO || ''} onChange={e => set('inicioISO', e.target.value)} />
            </div>
            <div className="field">
              <label>Previsão de devolução</label>
              <input type="date" value={form.devISO} onChange={e => set('devISO', e.target.value)} />
            </div>
          </div>

          {diasDuracao && (
            <div className="duracao-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Duração prevista: <strong>{diasDuracao} {diasDuracao === 1 ? 'dia' : 'dias'}</strong>
            </div>
          )}

          {/* Materiais */}
          <div className="field">
            <label>Materiais / Itens</label>
            {materiais.map((m, i) => (
              <div className="material-row" key={i}>
                <input
                  type="text"
                  value={m}
                  onChange={e => setMaterial(i, e.target.value)}
                  placeholder={`Item ${i + 1}…`}
                />
                {materiais.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMaterial(i)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >×</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-row" onClick={addMaterial}>
              + Adicionar item
            </button>
          </div>

          {/* Observação */}
          <div className="field">
            <label>Observação <span className="opcional">(opcional)</span></label>
            <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)} placeholder="Alguma observação importante…" rows={3} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={saving}>
            {saving ? 'Salvando…' : 'Criar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL APROVAR
══════════════════════════════════════ */
function ModalAprovar({ pedido, onClose, onFeito }) {
  const [devISO, setDevISO] = useState(pedido.devISO || '');
  const [obs, setObs]       = useState('');
  const [saving, setSaving] = useState(false);
  const { sol } = getPartes(pedido);

  async function confirmar() {
    setSaving(true);
    try {
      await api.patch(`/pedidos/${pedido.id}/aprovar`, { devISO, observacao: obs });
      onFeito?.();
      onClose();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Aprovar pedido</h3>
          <div className="modal-header-right">
            <span className="modal-badge verde">Aprovação</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--label)', marginBottom: 16 }}>
            Confirme a aprovação do empréstimo de <strong>{pedido.produto}</strong> para <strong>{sol.nome}</strong>.
          </p>
          <div className="field">
            <label>Data de devolução</label>
            <input type="date" value={devISO} onChange={e => setDevISO(e.target.value)} />
            <div className="field-hint">Deixe em branco se não houver prazo definido.</div>
          </div>
          <div className="field">
            <label>Observação da aprovação <span className="opcional">(opcional)</span></label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Material disponível a partir de segunda-feira…" rows={3} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-green" onClick={confirmar} disabled={saving}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {saving ? 'Aprovando…' : 'Confirmar aprovação'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL RECUSAR
══════════════════════════════════════ */
function ModalRecusar({ pedido, onClose, onFeito }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    if (!motivo.trim()) { alert('Informe o motivo da recusa.'); return; }
    setSaving(true);
    try {
      await api.patch(`/pedidos/${pedido.id}/recusar`, { motivo });
      onFeito?.();
      onClose();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-recusar" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Recusar pedido</h3>
          <div className="modal-header-right">
            <span className="modal-badge red">Recusa</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--label)', marginBottom: 16 }}>
            Informe o motivo da recusa do pedido de <strong>{pedido.produto}</strong>.
          </p>
          <div className="field">
            <label>Motivo da recusa</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Material indisponível no período solicitado…" rows={4} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-red" onClick={confirmar} disabled={saving}>
            {saving ? 'Recusando…' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL DEVOLVER
══════════════════════════════════════ */
function ModalDevolver({ pedido, onClose, onFeito }) {
  const [obs, setObs]           = useState('');
  const [ocorrencia, setOcorr]  = useState(false);
  const [tipoOcorr, setTipoOcorr] = useState('');
  const [descOcorr, setDescOcorr] = useState('');
  const [foto, setFoto]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();
  const { sol } = getPartes(pedido);

  async function confirmar() {
    setSaving(true);
    try {
      const payload = {
        observacao: obs,
        ocorrencia: ocorrencia ? { tipo: tipoOcorr, descricao: descOcorr } : null,
      };
      await api.patch(`/pedidos/${pedido.id}/devolver`, payload);
      onFeito?.();
      onClose();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-devol" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Registrar devolução</h3>
          <div className="modal-header-right">
            <span className="modal-badge amber">Devolução</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--label)', marginBottom: 16 }}>
            Confirmando a devolução de <strong>{pedido.produto}</strong> de <strong>{sol.nome}</strong>.
          </p>

          <div className="field">
            <label>Observação da devolução <span className="opcional">(opcional)</span></label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Estado do material, comentários…" rows={3} />
          </div>

          <div className="field">
            <label>Foto comprovante <span className="opcional">(opcional)</span></label>
            <div className="foto-upload" onClick={() => fileRef.current?.click()}>
              {foto
                ? <span style={{ color: 'var(--verde)' }}>📎 {foto.name}</span>
                : <><span className="icon">📷</span> Clique para anexar foto da devolução</>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setFoto(e.target.files?.[0] || null)} />
          </div>

          <hr className="sep" />

          <div className={`ocorr-toggle${ocorrencia ? ' ativo' : ''}`} onClick={() => setOcorr(o => !o)}>
            <span className="toggle-icon">⚠️</span>
            <div className="toggle-label">
              <strong>Registrar ocorrência</strong>
              <span>Avaria, perda, atraso ou outro problema</span>
            </div>
            <div className={`toggle-chk${ocorrencia ? ' on' : ''}`} />
          </div>

          {ocorrencia && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div className="field">
                <label style={{ color: 'var(--red)' }}>Tipo de ocorrência</label>
                <select value={tipoOcorr} onChange={e => setTipoOcorr(e.target.value)}
                  style={{ borderColor: '#7f1d1d', background: '#1a0505', color: 'var(--red)' }}>
                  <option value="">Selecione…</option>
                  <option value="Avaria">Avaria / Dano</option>
                  <option value="Perda">Perda / Extravio</option>
                  <option value="Atraso">Atraso na devolução</option>
                  <option value="Incompleto">Material incompleto</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="field">
                <label style={{ color: 'var(--red)' }}>Descrição da ocorrência</label>
                <textarea value={descOcorr} onChange={e => setDescOcorr(e.target.value)}
                  placeholder="Descreva o problema detalhadamente…" rows={3}
                  style={{ borderColor: '#7f1d1d', background: '#1a0505' }} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={confirmar} disabled={saving}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
            {saving ? 'Registrando…' : 'Confirmar devolução'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL ESTENDER
══════════════════════════════════════ */
function ModalEstender({ pedido, onClose, onFeito }) {
  const [novaData, setNovaData] = useState(pedido.devISO || '');
  const [saving, setSaving]     = useState(false);

  async function confirmar() {
    if (!novaData) { alert('Selecione a nova data.'); return; }
    setSaving(true);
    try {
      await api.patch(`/pedidos/${pedido.id}/estender`, { devISO: novaData });
      onFeito?.();
      onClose();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Estender prazo</h3>
          <div className="modal-header-right">
            <span className="modal-badge indigo">Extensão</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--label)', marginBottom: 16 }}>
            Definindo nova data de devolução para <strong>{pedido.produto}</strong>.
            {pedido.devISO && <> Prazo atual: <strong>{fmtData(pedido.devISO)}</strong>.</>}
          </p>
          <div className="field">
            <label>Nova data de devolução</label>
            <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={confirmar} disabled={saving}>
            {saving ? 'Salvando…' : 'Confirmar extensão'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MODAL DETALHES
══════════════════════════════════════ */
function ModalDetalhe({ pedido, onClose }) {
  const dias = diasRestantes(pedido.devISO);
  const { sol, con } = getPartes(pedido);

  // fotos: array de base64 ou URLs
  const fotos = pedido.fotos || [];

  // materiais ou itens — garante que seja sempre um array
  const itens = Array.isArray(pedido.materiais) ? pedido.materiais
              : Array.isArray(pedido.itens)     ? pedido.itens
              : [];

  // countdown display
  const diasLabel = (() => {
    if (dias === null) return null;
    if (dias < 0)  return { txt: `${Math.abs(dias)} dias em atraso`, cls: 'err' };
    if (dias === 0) return { txt: 'Devolução hoje',                  cls: 'warn' };
    if (dias <= 3)  return { txt: `${dias} dias restantes`,          cls: 'warn' };
    return           { txt: `${dias} dias restantes`,                 cls: 'ok' };
  })();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-detalhe" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes do pedido</h3>
          <div className="modal-header-right">
            <span className={statusBadgeCls(pedido.status)}>{STATUS_LABEL[pedido.status] || pedido.status}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Produto principal */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 4 }}>Produto</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{pedido.produto || pedido.nomeSolicitanteForm || '—'}</div>
            {pedido.numeroPedido && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>#{pedido.numeroPedido}</div>}
          </div>

          <hr className="sep" />

          {/* Partes: solicitante → concedente */}
          <div className="detalhe-partes">
            <div className="detalhe-parte">
              <div className="detalhe-parte-role">📤 Solicitante</div>
              <div className="detalhe-parte-nome">{sol.nome}</div>
              {sol.email && <div className="detalhe-parte-email">{sol.email}</div>}
            </div>
            <div className="detalhe-arrow">→</div>
            <div className="detalhe-parte">
              <div className="detalhe-parte-role">📥 Concedente</div>
              <div className="detalhe-parte-nome">{con.nome}</div>
              {con.email && <div className="detalhe-parte-email">{con.email}</div>}
            </div>
          </div>

          <hr className="sep" />

          {/* Grid de info */}
          <div className="pedido-info" style={{ marginBottom: 16 }}>
            <div>
              <div className="info-label">Criado em</div>
              <div className="info-value">
                {fmtData(pedido.criadoEm?.toDate ? pedido.criadoEm.toDate().toISOString().slice(0,10) : pedido.criadoEm)}
              </div>
            </div>
            {pedido.inicioISO && (
              <div>
                <div className="info-label">Início</div>
                <div className="info-value">{fmtData(pedido.inicioISO)}</div>
              </div>
            )}
            {pedido.devISO && (
              <div>
                <div className="info-label">Devolução</div>
                <div className={`info-value ${diasLabel?.cls || ''}`}>
                  {fmtData(pedido.devISO)}
                  {diasLabel && (
                    <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700 }}>{diasLabel.txt}</div>
                  )}
                </div>
              </div>
            )}
            {pedido.mgSolicitante && (
              <div>
                <div className="info-label">MG Solicitante</div>
                <div className="info-value" style={{ color: 'var(--indigo)' }}>{pedido.mgSolicitante}</div>
              </div>
            )}
            {pedido.mgConcedente && (
              <div>
                <div className="info-label">MG Concedente</div>
                <div className="info-value" style={{ color: 'var(--verde)' }}>{pedido.mgConcedente}</div>
              </div>
            )}
            {pedido.codigo && (
              <div>
                <div className="info-label">Código</div>
                <div className="info-value">{pedido.codigo}</div>
              </div>
            )}
          </div>

          {/* Produto concedente */}
          {pedido.produtoConcedente && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 4 }}>Produto Concedente</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{pedido.produtoConcedente}</div>
            </div>
          )}

          {/* Materiais */}
          {itens.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 6 }}>Materiais / Itens</div>
              <div className="pedido-materiais">
                {itens.map((m, i) => <div key={i}>• {m}</div>)}
              </div>
            </div>
          )}

          {/* Observação */}
          {pedido.observacao && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 4 }}>Observação</div>
              <div style={{ fontSize: 13, color: 'var(--label)', fontWeight: 500 }}>{pedido.observacao}</div>
            </div>
          )}

          {/* Ocorrência */}
          {pedido.ocorrencia?.tipo && (
            <div className="ocorrencia-box" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ {pedido.ocorrencia.tipo}</div>
              {pedido.ocorrencia.descricao && <div style={{ fontWeight: 500 }}>{pedido.ocorrencia.descricao}</div>}
            </div>
          )}

          {/* Retorno checklist ISO */}
          {(pedido.retISO || pedido.devISO) && pedido.status === 'devolvido' && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 4 }}>Devolvido em</div>
              <div style={{ fontSize: 13, color: 'var(--verde)', fontWeight: 700 }}>
                {fmtData(pedido.retISO || pedido.devolvidoEm)}
              </div>
            </div>
          )}

          {/* Fotos */}
          {fotos.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 6 }}>Fotos</div>
              <div className="fotos-grid">
                {fotos.map((f, i) => (
                  <img
                    key={i}
                    className="foto-thumb"
                    src={f.startsWith('data:') ? f : `data:image/jpeg;base64,${f}`}
                    alt={`Foto ${i + 1}`}
                    onClick={() => window.open(f.startsWith('data:') ? f : `data:image/jpeg;base64,${f}`, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════ */
function EmptyState({ icon, msg, sub }) {
  return (
    <div className="empty-state">
      {icon}
      <p>{msg}</p>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/* ══════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════ */
const TABS_EAC = ['Todos', 'Pendentes', 'Aprovados', 'Devoluções', 'Recusados'];

const TAB_STATUS = {
  'Todos':       '',
  'Pendentes':   'pendente',
  'Aprovados':   'aprovado',
  'Devoluções':  'devolvido',
  'Recusados':   'recusado',
};

export default function Emprestimos() {
  const { user, perm } = useAuth();
  const [tab,   setTab]   = useState('Todos');
  const [busca, setBusca] = useState('');

  const [modalNovo,     setModalNovo]     = useState(false);
  const [modalDetalhe,  setModalDetalhe]  = useState(null);
  const [modalAprovar,  setModalAprovar]  = useState(null);
  const [modalRecusar,  setModalRecusar]  = useState(null);
  const [modalDevolver, setModalDevolver] = useState(null);
  const [modalEstender, setModalEstender] = useState(null);

  const { pedidos: todosPedidos, loading, error, carregar: refresh } = usePedidos({});

  const pedidosFiltrados = todosPedidos.filter(p => {
    const statusOk = !TAB_STATUS[tab] || p.status === TAB_STATUS[tab];
    if (!statusOk) return false;
    if (!busca) return true;
    const q = busca.toLowerCase();
    const { sol, con } = getPartes(p);
    return (
      p.produto?.toLowerCase().includes(q)              ||
      sol.nome.toLowerCase().includes(q)                ||
      sol.email.toLowerCase().includes(q)               ||
      con.nome.toLowerCase().includes(q)                ||
      con.email.toLowerCase().includes(q)               ||
      String(p.numeroPedido || '').toLowerCase().includes(q)
    );
  });

  const nPendentes = todosPedidos.filter(p => p.status === 'pendente').length;

  if (loading) return (
    <div className="loading-full">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
        Carregando pedidos…
      </div>
    </div>
  );
  if (error) return <div style={{ color: 'var(--red)', padding: 20 }}>Erro: {error}</div>;

  return (
    <>
      <div className="section-header">
        <div className="module-tabs">
          {TABS_EAC.map(t => (
            <div key={t} className={`module-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'Pendentes' && nPendentes > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--amber)', color: '#111', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '0 5px' }}>{nPendentes}</span>
              )}
            </div>
          ))}
        </div>

        {perm('eac_criar') && (
          <button className="btn btn-primary" onClick={() => setModalNovo(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo pedido
          </button>
        )}
      </div>

      <SearchAutocomplete
        value={busca}
        onChange={setBusca}
        placeholder="Buscar por conteúdo, nome, e-mail ou código…"
      />

      {pedidosFiltrados.length === 0 ? (
        <EmptyState
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          }
          msg={busca ? 'Nenhum pedido encontrado para essa busca.' : `Nenhum pedido ${tab !== 'Todos' ? 'nessa categoria' : ''}.`}
          sub={busca ? 'Tente outros termos.' : 'Novos pedidos aparecerão aqui em tempo real.'}
        />
      ) : (
        <div className="pedido-list">
          {pedidosFiltrados.map(p => (
            <PedidoCard
              key={p.id}
              p={p}
              perm={perm}
              userEmail={user?.email}
              onDetalhe={setModalDetalhe}
              onAprovar={setModalAprovar}
              onRecusar={setModalRecusar}
              onDevolver={setModalDevolver}
              onEstender={setModalEstender}
            />
          ))}
        </div>
      )}

      {/* ══ MODAIS ══ */}
      {modalNovo     && <ModalNovoPedido onClose={() => setModalNovo(false)}    onSalvo={refresh} />}
      {modalDetalhe  && <ModalDetalhe   pedido={modalDetalhe}  onClose={() => setModalDetalhe(null)} />}
      {modalAprovar  && <ModalAprovar   pedido={modalAprovar}  onClose={() => setModalAprovar(null)}  onFeito={refresh} />}
      {modalRecusar  && <ModalRecusar   pedido={modalRecusar}  onClose={() => setModalRecusar(null)}  onFeito={refresh} />}
      {modalDevolver && <ModalDevolver  pedido={modalDevolver} onClose={() => setModalDevolver(null)} onFeito={refresh} />}
      {modalEstender && <ModalEstender  pedido={modalEstender} onClose={() => setModalEstender(null)} onFeito={refresh} />}
    </>
  );
}
