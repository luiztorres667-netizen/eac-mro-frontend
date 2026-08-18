import { useState, useEffect } from 'react';
import { useAuth }   from '../contexts/AuthContext';
import { useUsuarios } from '../hooks/useUsuarios';
import { permissoesApi } from '../api';

const SECOES_PERM = [
  { titulo:'Módulo EAC', itens:[
    { id:'eac_ver',      label:'Visualizar EAC' },
    { id:'eac_criar',    label:'Criar pedidos' },
    { id:'eac_aprovar',  label:'Aprovar / Recusar' },
    { id:'eac_estender', label:'Estender prazo' },
    { id:'eac_devolver', label:'Registrar devolução' },
    { id:'eac_cobrar',   label:'Enviar cobrança' },
  ]},
  { titulo:'Relatórios', itens:[
    { id:'rel_ver',   label:'Ver dashboard' },
    { id:'rel_kpi',   label:'Ver KPIs' },
    { id:'rel_ocorr', label:'Ver ocorrências' },
  ]},
  { titulo:'Notificações', itens:[
    { id:'notif_ver',  label:'Notificações de pedidos' },
    { id:'notif_gest', label:'Notificações de gestão' },
    { id:'notif_cob',  label:'Alertas de cobrança' },
  ]},
  { titulo:'Usuários & Cargos', itens:[
    { id:'usr_ver',    label:'Ver usuários' },
    { id:'usr_editar', label:'Editar cargos' },
    { id:'usr_perm',   label:'Gerenciar permissões' },
    { id:'usr_criar',  label:'Criar usuários' },
  ]},
];

const CARGOS_TABLE = [
  { key:'gestor',      label:'Gestor' },
  { key:'gerentegeral',label:'Ger. Geral' },
  { key:'gerente',     label:'Gerente' },
  { key:'coordenador', label:'Coord.' },
  { key:'supervisor',  label:'Supervisor' },
  { key:'encarregado', label:'Encarr.' },
  { key:'almoxarife',  label:'Almoxarife' },
  { key:'mutuario',    label:'Solicitante' },
];

export default function Usuarios() {
  const { perm, user } = useAuth();
  const { usuarios, solicitacoes, loading, atualizarCargo, aprovarSolic, recusarSolic } = useUsuarios();

  const [aba,        setAba]       = useState('usuarios');
  const [permState,  setPermState] = useState({});
  const [salvando,   setSalvando]  = useState(false);

  // Carrega permissões
  useEffect(() => {
    permissoesApi.obter().then(d => setPermState(d.permState || {}));
  }, []);

  async function salvarPermissoes() {
    setSalvando(true);
    try {
      await permissoesApi.salvar(permState);
      alert('Permissões salvas!');
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  }

  function togglePerm(permId, cargoKey) {
    setPermState(prev => ({
      ...prev,
      [permId]: {
        ...prev[permId],
        [cargoKey]: prev[permId]?.[cargoKey] ? 0 : 1,
      }
    }));
  }

  if (loading) return <div className="page-loading">Carregando…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Usuários & Cargos</h1>
      </div>

      {/* Abas */}
      <div className="tabs">
        <button className={`tab ${aba==='usuarios'?'active':''}`}    onClick={()=>setAba('usuarios')}>Usuários</button>
        {solicitacoes.length > 0 && (
          <button className={`tab ${aba==='solicitacoes'?'active':''}`} onClick={()=>setAba('solicitacoes')}>
            Solicitações <span className="badge-count">{solicitacoes.length}</span>
          </button>
        )}
        {perm('usr_perm') && (
          <button className={`tab ${aba==='permissoes'?'active':''}`} onClick={()=>setAba('permissoes')}>
            Controle de Acesso
          </button>
        )}
      </div>

      {/* ── Lista de usuários ── */}
      {aba === 'usuarios' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Matrícula</th><th>Setor</th><th>Cargo</th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.matricula}</td>
                  <td>{u.setor || '—'}</td>
                  <td>
                    {perm('usr_editar') ? (
                      <select value={u.cargo || ''} onChange={e => atualizarCargo(u.id, e.target.value)}>
                        {['Admin','Gestor','Gerente Geral','Gerente','Coordenador','Supervisor',
                          'Encarregado','Almoxarife','Aux. Almoxarifado','Solicitante/Responsável'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : u.cargo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Solicitações ── */}
      {aba === 'solicitacoes' && (
        <div className="solicitacoes-lista">
          {solicitacoes.map(s => (
            <div key={s.id} className="card-solic">
              <div className="solic-info">
                <strong>{s.nome}</strong> — {s.email}
                <div className="solic-meta">
                  <span>Setor: {s.setor}</span>
                  {s.cargo && <span>Cargo informado: {s.cargo}</span>}
                </div>
              </div>
              <div className="solic-acoes">
                <button className="btn btn-sm btn-verde" onClick={() => aprovarSolic(s.id, s.cargo || 'Almoxarife')}>
                  Aprovar
                </button>
                <button className="btn btn-sm btn-perigo" onClick={() => recusarSolic(s.id)}>
                  Recusar
                </button>
              </div>
            </div>
          ))}
          {solicitacoes.length === 0 && (
            <div className="empty-state">Nenhuma solicitação pendente.</div>
          )}
        </div>
      )}

      {/* ── Controle de acesso ── */}
      {aba === 'permissoes' && perm('usr_perm') && (
        <div className="perm-section-wrap">
          <div className="perm-header">
            <p>Defina o que cada cargo pode fazer. Admin sempre tem acesso total.</p>
            <button className="btn btn-primary" onClick={salvarPermissoes} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>

          {SECOES_PERM.map(secao => (
            <div key={secao.titulo} className="perm-secao">
              <div className="perm-secao-titulo">{secao.titulo}</div>
              <div className="table-wrap">
                <table className="perm-table">
                  <thead>
                    <tr>
                      <th>Permissão</th>
                      <th>Admin</th>
                      {CARGOS_TABLE.map(c => <th key={c.key}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {secao.itens.map(item => (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        {/* Admin fixo */}
                        <td><div className="perm-toggle on locked" /></td>
                        {CARGOS_TABLE.map(c => {
                          const on = !!permState[item.id]?.[c.key];
                          return (
                            <td key={c.key}>
                              <div
                                className={`perm-toggle ${on?'on':''}`}
                                onClick={() => togglePerm(item.id, c.key)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
