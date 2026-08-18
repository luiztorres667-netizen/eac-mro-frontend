import { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Helpers ── */
function parseDate(val) {
  if (!val) return null;
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds  !== undefined) return new Date(val.seconds  * 1000);
  if (typeof val === 'string') return new Date(val.length === 10 ? val + 'T00:00:00' : val);
  return new Date(val);
}
function fmtData(val) {
  if (!val) return '—';
  try { const d = parseDate(val); return d && !isNaN(d) ? d.toLocaleDateString('pt-BR') : '—'; } catch { return '—'; }
}

const STATUS_LABEL = {
  pendente:             'Aguardando aprovação',
  aprovado:             'Aprovado / Liberado',
  aguardando_devolucao: 'Aguard. devolução',
  devolvido:            'Devolvido',
  cancelado:            'Cancelado',
  recusado:             'Recusado',
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

/* ── KPI Card ── */
function KpiCard({ label, value, cls }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${cls || ''}`}>{value}</div>
    </div>
  );
}

/* ── Bar simples (pure CSS) ── */
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{d.v}</div>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            height: `${(d.v / max) * 80}px`, minHeight: d.v > 0 ? 4 : 0,
            background: d.cor || 'var(--verde)', transition: 'height .4s',
          }} />
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.k}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Linha de progresso ── */
function ProgressRow({ label, value, total, cor }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: cor || 'var(--text)' }}>
          {value} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border-s)', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor || 'var(--verde)', borderRadius: 99, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

export default function Relatorios() {
  const [loading,  setLoading]  = useState(true);
  const [pedidos,  setPedidos]  = useState([]);
  const [filtro,   setFiltro]   = useState({ de: '', ate: '', status: '', mg: '' });
  const [filtrado, setFiltrado] = useState([]);

  useEffect(() => {
    api.get('/pedidos')
      .then(data => {
        setPedidos(Array.isArray(data) ? data : data.pedidos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let lista = [...pedidos];
    if (filtro.status) lista = lista.filter(p => p.status === filtro.status);
    if (filtro.mg)     lista = lista.filter(p => p.mgSolicitante === filtro.mg || p.mgConcedente === filtro.mg);
    if (filtro.de)     lista = lista.filter(p => { const d = parseDate(p.criadoEm); return d && d.toISOString().slice(0,10) >= filtro.de; });
    if (filtro.ate)    lista = lista.filter(p => { const d = parseDate(p.criadoEm); return d && d.toISOString().slice(0,10) <= filtro.ate; });
    setFiltrado(lista);
  }, [pedidos, filtro]);

  function set(k, v) { setFiltro(f => ({ ...f, [k]: v })); }
  function limpar()  { setFiltro({ de: '', ate: '', status: '', mg: '' }); }

  const total       = filtrado.length;
  const pendentes   = filtrado.filter(p => p.status === 'pendente').length;
  const aprovados   = filtrado.filter(p => p.status === 'aprovado').length;
  const devolvidos  = filtrado.filter(p => p.status === 'devolvido').length;
  const recusados   = filtrado.filter(p => p.status === 'recusado').length;
  const ocorrencias = filtrado.filter(p => p.ocorrencia?.tipo).length;

  const porMG = {};
  filtrado.forEach(p => {
    const mg = p.mgSolicitante || 'Sem MG';
    porMG[mg] = (porMG[mg] || 0) + 1;
  });
  const mgData = Object.entries(porMG).sort((a,b) => b[1]-a[1]).map(([k,v]) => ({ k, v }));

  const statusData = [
    { k: 'Pendente',  v: pendentes,  cor: 'var(--amber)' },
    { k: 'Aprovado',  v: aprovados,  cor: 'var(--verde)' },
    { k: 'Devolvido', v: devolvidos, cor: '#6b82c4' },
    { k: 'Recusado',  v: recusados,  cor: 'var(--red)' },
  ].filter(d => d.v > 0);

  if (loading) return (
    <div className="loading-full">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
        Carregando relatórios…
      </div>
    </div>
  );

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 };

  return (
    <>
      {/* ── Filtros ── */}
      <div className="dash-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}>De</label>
            <input type="date" value={filtro.de}     onChange={e => set('de', e.target.value)}     style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}>Até</label>
            <input type="date" value={filtro.ate}    onChange={e => set('ate', e.target.value)}    style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}>Status</label>
            <select value={filtro.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              <option value="pendente">Aguardando aprovação</option>
              <option value="aprovado">Aprovado / Liberado</option>
              <option value="aguardando_devolucao">Aguardando confirmação</option>
              <option value="devolvido">Devolvido</option>
              <option value="recusado">Recusado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={labelStyle}>Setor (MG)</label>
            <select value={filtro.mg} onChange={e => set('mg', e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              <option value="MG1">MG1</option>
              <option value="MG2">MG2</option>
              <option value="MG3">MG3</option>
              <option value="MG4">MG4</option>
              <option value="Cenografia">Cenografia</option>
              <option value="Arte">Arte</option>
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={limpar} style={{ flexShrink: 0 }}>Limpar</button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-row">
        <KpiCard label="Total de pedidos" value={total}      cls="" />
        <KpiCard label="Pendentes"         value={pendentes}  cls="amber" />
        <KpiCard label="Aprovados"         value={aprovados}  cls="verde" />
        <KpiCard label="Devolvidos"        value={devolvidos} cls="indigo" />
        <KpiCard label="Recusados"         value={recusados}  cls="red" />
        {ocorrencias > 0 && <KpiCard label="Ocorrências" value={ocorrencias} cls="red" />}
      </div>

      {/* ── Gráficos ── */}
      <div className="dash-grid">
        <div className="dash-card">
          <h4>Distribuição por status</h4>
          {statusData.length > 0
            ? <>
                <BarChart data={statusData} />
                <div style={{ marginTop: 16 }}>
                  <ProgressRow label="Aprovados"  value={aprovados}  total={total} cor="var(--verde)" />
                  <ProgressRow label="Pendentes"  value={pendentes}  total={total} cor="var(--amber)" />
                  <ProgressRow label="Devolvidos" value={devolvidos} total={total} cor="#6b82c4" />
                  <ProgressRow label="Recusados"  value={recusados}  total={total} cor="var(--red)" />
                </div>
              </>
            : <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Sem dados para exibir.</p>
          }
        </div>

        <div className="dash-card">
          <h4>Pedidos por setor (MG)</h4>
          {mgData.length > 0
            ? <>
                <BarChart data={mgData} />
                <div style={{ marginTop: 16 }}>
                  {mgData.map(d => (
                    <ProgressRow key={d.k} label={d.k} value={d.v} total={total} cor="var(--azul-soft)" />
                  ))}
                </div>
              </>
            : <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                Nenhum pedido com setor (MG) definido.
              </p>
          }
        </div>
      </div>

      {/* ── Tabela ocorrências ── */}
      {ocorrencias > 0 && (
        <div className="dash-card" style={{ marginBottom: 16 }}>
          <h4>⚠️ Ocorrências registradas</h4>
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th><th>Solicitante</th><th>Tipo</th><th>Descrição</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.filter(p => p.ocorrencia?.tipo).map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.produto}</td>
                  <td>{p.solicitante || '—'}</td>
                  <td><span className="status-badge status-recusado">{p.ocorrencia.tipo}</span></td>
                  <td style={{ color: 'var(--muted)' }}>{p.ocorrencia.descricao || '—'}</td>
                  <td><span className={statusBadgeCls(p.status)}>{STATUS_LABEL[p.status] || p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tabela completa ── */}
      <div className="dash-card">
        <h4>Todos os pedidos ({filtrado.length})</h4>
        {filtrado.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Nenhum pedido no período selecionado.</p>
          : <div style={{ overflowX: 'auto' }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>#</th><th>Produto</th><th>Solicitante</th><th>Concedente</th><th>MG</th><th>Devolução</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--muted)' }}>{p.numeroPedido || i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{p.produto}</td>
                      <td>{p.solicitante || '—'}</td>
                      <td>{p.concedente || '—'}</td>
                      <td>{p.mgSolicitante || '—'}</td>
                      <td>{fmtData(p.devISO)}</td>
                      <td><span className={statusBadgeCls(p.status)}>{STATUS_LABEL[p.status] || p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  );
}
