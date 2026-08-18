import { useState, useMemo } from 'react';
import { usePedidos } from '../hooks/usePedidos';

export default function Relatorios() {
  const { pedidos, loading } = usePedidos();
  const [mg,     setMg]     = useState('');
  const [status, setStatus] = useState('');

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      if (mg     && p.mgSolicitante !== mg && p.mgConcedente !== mg) return false;
      if (status && p.status !== status) return false;
      return true;
    });
  }, [pedidos, mg, status]);

  // KPIs
  const kpis = useMemo(() => ({
    total:    filtrados.length,
    pendente: filtrados.filter(p => p.status === 'pendente').length,
    aprovado: filtrados.filter(p => p.status === 'aprovado').length,
    devolvido:filtrados.filter(p => p.status === 'devolvido').length,
  }), [filtrados]);

  const setores = ['MG1','MG2','MG3','MG4','Cenografia','Arte'];

  if (loading) return <div className="page-loading">Carregando relatórios…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatórios</h1>
        <div className="page-actions">
          <select value={mg} onChange={e=>setMg(e.target.value)} className="select-sm">
            <option value="">Todos os MGs</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="select-sm">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="devolvido">Devolvido</option>
            <option value="recusado">Recusado</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={()=>{setMg('');setStatus('');}}>
            Limpar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total</div>
          <div className="kpi-valor">{kpis.total}</div>
        </div>
        <div className="kpi-card kpi-pendente">
          <div className="kpi-label">Pendentes</div>
          <div className="kpi-valor">{kpis.pendente}</div>
        </div>
        <div className="kpi-card kpi-aprovado">
          <div className="kpi-label">Aprovados</div>
          <div className="kpi-valor">{kpis.aprovado}</div>
        </div>
        <div className="kpi-card kpi-devolvido">
          <div className="kpi-label">Devolvidos</div>
          <div className="kpi-valor">{kpis.devolvido}</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Solicitante</th>
              <th>MG Sol.</th>
              <th>MG Con.</th>
              <th>Status</th>
              <th>Devolução</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id}>
                <td>{p.codigo || p.numeroPedido || p.id.slice(0,8)}</td>
                <td>{p.produto}</td>
                <td>{p.criadoPorNome || p.criadoPor}</td>
                <td>{p.mgSolicitante || '—'}</td>
                <td>{p.mgConcedente  || '—'}</td>
                <td><span className={`badge badge-sm badge-${p.status}`}>{p.status}</span></td>
                <td>{p.devISO || '—'}</td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="td-vazio">Nenhum pedido.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
