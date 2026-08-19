import { useState, useEffect } from 'react';
import { useAuth }     from '../contexts/AuthContext';
import { useUsuarios } from '../hooks/useUsuarios';
import { permissoesApi } from '../api';

/* ──────────────────────────────────────
   CARGOS DO SISTEMA
────────────────────────────────────── */
const CARGOS = ['Usuário', 'Arte', 'Cenografia', 'Almoxarife', 'Gestor', 'Admin'];

/* ── Mapa de cargos → chip class ── */
function cargoCls(cargo) {
  if (!cargo) return '';
  const c = cargo.toLowerCase();
  if (c === 'admin')       return 'admin';
  if (c === 'gestor')      return 'gestor';
  if (c === 'almoxarife')  return 'almox';
  if (c === 'arte')        return 'arte';
  if (c === 'cenografia')  return 'ceno';
  return '';
}

function iniciais(nome, email) {
  if (nome) return nome.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  return (email?.[0] || '?').toUpperCase();
}

/* ══════════════════════════════════════
   MODAL NOVO USUÁRIO
══════════════════════════════════════ */
function ModalNovoUsuario({ onClose, onSalvo }) {
  const [form, setForm]   = useState({ nome: '', email: '', cargo: 'Usuário', matricula: '' });
  const [saving, setSaving] = useState(false);
  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.email.trim() || !form.nome.trim()) { alert('Preencha nome e e-mail.'); return; }
    setSaving(true);
    try {
      await onSalvo(form);
      onClose();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Novo usuário</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nome completo</label>
            <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do usuário" />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Cargo</label>
              <select value={form.cargo} onChange={e => set('cargo', e.target.value)}>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Matrícula <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
              <input type="text" value={form.matricula} onChange={e => set('matricula', e.target.value)} placeholder="Ex: 12345" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={saving}>
            {saving ? 'Salvando…' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   CARD DE USUÁRIO
══════════════════════════════════════ */
function UsuarioCard({ u, onCargo, onExcluir, podeEditar }) {
  const [editando, setEditando] = useState(false);
  const [cargo, setCargo]       = useState(u.cargo || 'Usuário');

  async function salvarCargo() {
    try { await onCargo(u.id, cargo); setEditando(false); }
    catch (e) { alert('Erro: ' + e.message); }
  }

  return (
    <div className="usuario-card">
      <div className="usuario-avatar">{iniciais(u.nome, u.email)}</div>
      <div className="usuario-info">
        <div className="usuario-nome">{u.nome || '—'}</div>
        <div className="usuario-email">{u.email}</div>
        {u.matricula && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>#{u.matricula}</div>}
      </div>

      {/* Cargo */}
      {editando && podeEditar
        ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={cargo} onChange={e => setCargo(e.target.value)}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 11, fontWeight: 700, padding: '4px 8px', fontFamily: 'var(--font)' }}>
              {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-green btn-sm" onClick={salvarCargo}>✓</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditando(false)}>✕</button>
          </div>
        : <span
            className={`cargo-chip ${cargoCls(u.cargo)}`}
            onClick={() => podeEditar && setEditando(true)}
            title={podeEditar ? 'Clique para editar cargo' : ''}
            style={{ cursor: podeEditar ? 'pointer' : 'default' }}
          >
            {u.cargo || 'Sem cargo'}
          </span>
      }

      {/* Excluir */}
      {podeEditar && !editando && (
        <button
          onClick={() => { if (window.confirm(`Excluir ${u.nome || u.email}?`)) onExcluir(u.id); }}
          title="Excluir usuário"
          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', borderRadius: 6, transition: 'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   CARD DE SOLICITAÇÃO PENDENTE
══════════════════════════════════════ */
function SolicCard({ s, onAprovar, onRecusar }) {
  const [cargo, setCargo] = useState('Usuário');

  return (
    <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber)', borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: 22 }}>🔔</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{s.nome || s.email}</div>
        <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>Solicita acesso ao sistema</div>
      </div>
      <select value={cargo} onChange={e => setCargo(e.target.value)}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 11, fontWeight: 700, padding: '4px 8px', fontFamily: 'var(--font)' }}>
        {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button className="btn btn-green btn-sm" onClick={() => onAprovar(s.id, cargo)}>Aprovar</button>
      <button className="btn btn-red btn-sm"   onClick={() => onRecusar(s.id)}>Recusar</button>
    </div>
  );
}

/* ══════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════ */
const TABS_USR = ['Usuários & Cargos', 'Controle de Acesso'];

export default function Usuarios() {
  const { perm }  = useAuth();
  const [tab, setTab]         = useState('Usuários & Cargos');
  const [modalNovo, setModalNovo] = useState(false);
  const [busca, setBusca]     = useState('');

  const { usuarios, solicitacoes, loading, error, criar, atualizarCargo, excluir, aprovarSolic, recusarSolic } = useUsuarios();

  const podeEditar = perm('usr_editar');

  const filtrados = usuarios.filter(u => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.cargo?.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="loading-full">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
        Carregando usuários…
      </div>
    </div>
  );
  if (error) return <div style={{ color: 'var(--red)', padding: 20 }}>Erro: {error}</div>;

  return (
    <>
      {/* ── Tabs principais ── */}
      <div className="module-tabs" style={{ marginBottom: 20, width: '100%' }}>
        {TABS_USR.map(t => (
          <div key={t} className={`module-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center' }}>
            {t}
          </div>
        ))}
      </div>

      {/* ══ SUB-VIEW: USUÁRIOS & CARGOS ══ */}
      {tab === 'Usuários & Cargos' && (
        <>
          {/* Solicitações pendentes */}
          {solicitacoes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Solicitações de acesso pendentes</span>
                <span style={{ background: 'var(--amber)', color: '#111', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>{solicitacoes.length}</span>
              </div>
              {solicitacoes.map(s => (
                <SolicCard key={s.id} s={s} onAprovar={aprovarSolic} onRecusar={recusarSolic} />
              ))}
            </div>
          )}

          {/* Cabeçalho */}
          <div className="section-header">
            <h3>Usuários cadastrados ({filtrados.length})</h3>
            {podeEditar && (
              <button className="btn btn-primary btn-sm" onClick={() => setModalNovo(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Novo usuário
              </button>
            )}
          </div>

          {/* Busca */}
          <div className="busca-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="busca-input"
              type="text"
              placeholder="Buscar por nome, e-mail ou cargo…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {/* Lista */}
          {filtrados.length === 0
            ? <div className="empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <p>Nenhum usuário encontrado.</p>
              </div>
            : filtrados.map(u => (
                <UsuarioCard
                  key={u.id}
                  u={u}
                  podeEditar={podeEditar}
                  onCargo={atualizarCargo}
                  onExcluir={excluir}
                />
              ))
          }
        </>
      )}

      {/* ══ SUB-VIEW: CONTROLE DE ACESSO ══ */}
      {tab === 'Controle de Acesso' && (
        <ControleAcesso />
      )}

      {/* ── Modal novo usuário ── */}
      {modalNovo && (
        <ModalNovoUsuario
          onClose={() => setModalNovo(false)}
          onSalvo={criar}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════
   CONTROLE DE ACESSO (PERMISSÕES)
══════════════════════════════════════ */
const PERMS_DEF = [
  { id: 'eac_ver',      label: 'Ver pedidos',          grupo: 'Controle EAC' },
  { id: 'eac_criar',    label: 'Criar pedidos',         grupo: 'Controle EAC' },
  { id: 'eac_aprovar',  label: 'Aprovar / Recusar',     grupo: 'Controle EAC' },
  { id: 'eac_devolver', label: 'Registrar devolução',   grupo: 'Controle EAC' },
  { id: 'eac_estender', label: 'Estender prazo',        grupo: 'Controle EAC' },
  { id: 'rel_ver',      label: 'Ver relatórios',        grupo: 'Relatórios'   },
  { id: 'usr_ver',      label: 'Ver usuários',          grupo: 'Usuários'     },
  { id: 'usr_editar',   label: 'Editar usuários',       grupo: 'Usuários'     },
  { id: 'notif_ver',    label: 'Ver notificações',      grupo: 'Notificações' },
];

const GRUPOS = [...new Set(PERMS_DEF.map(p => p.grupo))];
const CARGOS_PERM = ['Usuário', 'Arte', 'Cenografia', 'Almoxarife', 'Gestor', 'Admin'];

/* Cor de acento por cargo */
const CARGO_COR = {
  'Usuário':    { bg: 'var(--border)',     fg: 'var(--label)',  dim: 'transparent'      },
  'Arte':       { bg: 'var(--indigo)',     fg: '#fff',          dim: 'var(--indigo-dim)' },
  'Cenografia': { bg: 'var(--amber)',      fg: '#111',          dim: 'var(--amber-dim)'  },
  'Almoxarife': { bg: '#22c55e',          fg: '#fff',          dim: '#22c55e14'         },
  'Gestor':     { bg: 'var(--verde)',      fg: '#000',          dim: 'var(--verde-dim)'  },
  'Admin':      { bg: 'var(--red)',        fg: '#fff',          dim: 'var(--red-dim)'    },
};

function defaultState() {
  const s = {};
  CARGOS_PERM.forEach(c => {
    s[c] = {};
    PERMS_DEF.forEach(p => { s[c][p.id] = c === 'Admin'; });
  });
  return s;
}

function ControleAcesso() {
  const [state, setState]           = useState(defaultState);
  const [loadingPerms, setLoading]  = useState(true);
  const [saved, setSaved]           = useState(false);
  const [cargoAtivo, setCargoAtivo] = useState('Arte');

  useEffect(() => {
    permissoesApi.obter().then(dados => {
      const ps = dados.permState || {};
      if (Object.keys(ps).length === 0) { setLoading(false); return; }

      const firstKey = Object.keys(ps)[0];
      if (CARGOS_PERM.includes(firstKey)) {
        setState(s => {
          const next = { ...s };
          CARGOS_PERM.forEach(c => {
            if (ps[c]) next[c] = { ...next[c], ...ps[c] };
          });
          PERMS_DEF.forEach(p => { next['Admin'][p.id] = true; });
          return next;
        });
      } else {
        // Formato legado perm→cargo
        const conv = defaultState();
        PERMS_DEF.forEach(p => {
          if (ps[p.id]) {
            CARGOS_PERM.forEach(c => {
              conv[c][p.id] = c === 'Admin' ? true : !!ps[p.id][c];
            });
          }
        });
        setState(conv);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggle(cargo, permId) {
    if (cargo === 'Admin') return;
    setState(s => ({
      ...s,
      [cargo]: { ...s[cargo], [permId]: !s[cargo][permId] }
    }));
    setSaved(false);
  }

  async function salvar() {
    try {
      const toSave = { ...state, Admin: {} };
      PERMS_DEF.forEach(p => { toSave['Admin'][p.id] = true; });
      await permissoesApi.salvar(toSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert('Erro ao salvar: ' + e.message); }
  }

  if (loadingPerms) return (
    <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Carregando permissões…</div>
  );

  const cor = CARGO_COR[cargoAtivo] || CARGO_COR['Usuário'];
  const isAdmin = cargoAtivo === 'Admin';

  /* Conta permissões ativas por cargo (para os chips) */
  function countAtivas(c) {
    return PERMS_DEF.filter(p => state[c]?.[p.id]).length;
  }

  return (
    <div style={{ maxWidth: 520 }}>
      {/* ── Cabeçalho ── */}
      <div className="section-header" style={{ marginBottom: 6 }}>
        <div>
          <h3 style={{ margin: 0 }}>Controle de acesso</h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, margin: '3px 0 0' }}>
            Selecione um cargo e ajuste suas permissões
          </p>
        </div>
        <button
          className={`btn btn-sm ${saved ? 'btn-green' : 'btn-primary'}`}
          onClick={salvar}
          style={{ minWidth: 120 }}
        >
          {saved
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Salvo!</>
            : 'Salvar alterações'
          }
        </button>
      </div>

      {/* ── Cargo pills ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, marginTop: 4 }}>
        {CARGOS_PERM.map(c => {
          const ativo = c === cargoAtivo;
          const cc = CARGO_COR[c] || CARGO_COR['Usuário'];
          const n = countAtivas(c);
          return (
            <button
              key={c}
              onClick={() => setCargoAtivo(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                border: `1.5px solid ${ativo ? cc.bg : 'var(--border)'}`,
                background: ativo ? cc.dim : 'var(--card)',
                color: ativo ? cc.bg : 'var(--label)',
                fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
                transition: 'all .15s',
                fontFamily: 'var(--font)',
              }}
            >
              {c === 'Admin' && <span style={{ fontSize: 9 }}>🔒</span>}
              {c}
              <span style={{
                background: ativo ? cc.bg : 'var(--border)',
                color: ativo ? cc.fg : 'var(--muted)',
                fontSize: 9, fontWeight: 800,
                borderRadius: 99, padding: '1px 5px',
                minWidth: 16, textAlign: 'center',
              }}>
                {n}/{PERMS_DEF.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Painel de permissões do cargo ativo ── */}
      <div style={{
        background: 'var(--card)',
        border: `1.5px solid ${cor.bg}40`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Topo colorido com nome do cargo */}
        <div style={{
          background: cor.dim,
          borderBottom: `1px solid ${cor.bg}30`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: cor.bg, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {cargoAtivo}
          </span>
          {isAdmin
            ? <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>🔒 Acesso total — não editável</span>
            : <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
                {countAtivas(cargoAtivo)} de {PERMS_DEF.length} permissões ativas
              </span>
          }
        </div>

        {/* Lista de permissões agrupadas */}
        {GRUPOS.map((grupo, gi) => (
          <div key={grupo}>
            {/* Separador de grupo */}
            <div style={{
              padding: '8px 16px 4px',
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '.1em', color: 'var(--verde)',
              background: gi > 0 ? 'var(--bg)' : undefined,
              borderTop: gi > 0 ? '1px solid var(--border-s)' : undefined,
            }}>
              {grupo}
            </div>

            {PERMS_DEF.filter(p => p.grupo === grupo).map((p, pi, arr) => {
              const on = state[cargoAtivo]?.[p.id] ?? false;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: pi < arr.length - 1 ? '1px solid var(--border-s)' : undefined,
                    background: on && !isAdmin ? `${cor.bg}08` : undefined,
                    transition: 'background .15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? 'var(--text)' : 'var(--label)' }}>
                      {p.label}
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => toggle(cargoAtivo, p.id)}
                    disabled={isAdmin}
                    title={isAdmin ? 'Admin tem acesso total' : on ? 'Clique para revogar' : 'Clique para permitir'}
                    style={{
                      width: 40, height: 22, borderRadius: 99,
                      border: 'none',
                      background: on ? cor.bg : 'var(--border)',
                      position: 'relative',
                      cursor: isAdmin ? 'not-allowed' : 'pointer',
                      transition: 'background .2s',
                      flexShrink: 0,
                      opacity: isAdmin ? 0.7 : 1,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3, left: on ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff',
                      transition: 'left .2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                      display: 'block',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dica */}
      <p style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 500, marginTop: 12, lineHeight: 1.5 }}>
        As alterações só são aplicadas após clicar em <strong style={{ color: 'var(--label)' }}>Salvar alterações</strong>.
        O cargo Admin sempre tem acesso total ao sistema.
      </p>
    </div>
  );
}
