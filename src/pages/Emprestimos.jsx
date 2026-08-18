import { useState } from 'react';
import { useAuth }   from '../contexts/AuthContext';
import { usePedidos } from '../hooks/usePedidos';

const STATUS_LABEL = {
  pendente:               'Aguardando aprovação',
  aprovado:               'Aprovado / Liberado',
  aguardando_devolucao:   'Aguardando confirmação de devolução',
  devolvido:              'Devolvido',
  cancelado:              'Cancelado',
  recusado:               'Recusado',
};

const STATUS_CLS = {
  pendente:             'badge-pendente',
  aprovado:             'badge-aprovado',
  aguardando_devolucao: 'badge-aguardando',
  devolvido:            'badge-devolvido',
  cancelado:            'badge-cancelado',
  recusado:             'badge-recusado',
};

export default function Emprestimos() {
  const { perm }   = useAuth();
  const [filtroStatus, setFiltroStatus] = useState('');

  const { pedidos, loading, error, aprovar, recusar, devolver, estender } =
    usePedidos(filtroStatus ? { status: filtroStatus } : {});

  if (loading) return <div className="page-loading">Carregando pedidos…</div>;
  if (error)   return <div className="page-error">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Controle EAC</h1>
        <div className="page-actions">
          {/* Filtro de status */}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="select-sm">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {perm('eac_criar') && (
            <button className="btn btn-primary" onClick={() => alert('TODO: abrir modal novo pedido')}>
              + Novo pedido
            </button>
          )}
        </div>
      </div>

      {pedidos.length === 0 && (
        <div className="empty-state">Nenhum pedido encontrado.</div>
      )}

      <div className="pedidos-lista">
        {pedidos.map(p => (
          <div key={p.id} className="card-pedido">
            <div className="card-pedido-header">
              <div>
                <div className="pedido-codigo">{p.codigo || p.numeroPedido || p.id.slice(0,8)}</div>
                <div className="pedido-produto">{p.produto}</div>
              </div>
              <span className={`badge ${STATUS_CLS[p.status]}`}>
                {STATUS_LABEL[p.status] || p.status}
              </span>
            </div>

            <div className="card-pedido-info">
              <span><strong>Solicitante:</strong> {p.criadoPorNome || p.criadoPor}</span>
              {p.mgSolicitante && <span><strong>MG Sol.:</strong> {p.mgSolicitante}</span>}
              {p.mgConcedente  && <span><strong>MG Con.:</strong> {p.mgConcedente}</span>}
              {p.devISO        && <span><strong>Devolução:</strong> {p.devISO}</span>}
            </div>

            {/* Ações */}
            <div className="card-pedido-acoes">
              {perm('eac_aprovar') && p.status === 'pendente' && <>
                <button className="btn btn-sm btn-verde" onClick={() => aprovar(p.id)}>Aprovar</button>
                <button className="btn btn-sm btn-perigo" onClick={() => {
                  const motivo = prompt('Motivo da recusa:');
                  if (motivo !== null) recusar(p.id, motivo);
                }}>Recusar</button>
              </>}

              {perm('eac_devolver') && ['aprovado','aguardando_devolucao'].includes(p.status) && (
                <button className="btn btn-sm btn-outline" onClick={() => devolver(p.id, { motivo: 'Devolvido' })}>
                  Registrar devolução
                </button>
              )}

              {perm('eac_estender') && p.status === 'aprovado' && (
                <button className="btn btn-sm btn-outline" onClick={() => {
                  const data = prompt('Nova data de devolução (YYYY-MM-DD):');
                  if (data) estender(p.id, data);
                }}>Estender</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
