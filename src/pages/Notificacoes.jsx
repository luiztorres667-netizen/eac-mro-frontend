import { useState, useEffect } from 'react';
import { api } from '../api';

function tempoAtras(ts) {
  if (!ts) return '';
  const agora = Date.now();
  const d = typeof ts === 'object' && ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.round((agora - d.getTime()) / 1000);
  if (diff < 60)   return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function tipoIcon(tipo) {
  const map = { aprovado: '✅', recusado: '✕', devolvido: '↩', pedido: '📋', alerta: '⚠️' };
  return map[tipo] || '🔔';
}
function tipoCls(tipo) {
  const map = { aprovado: 'ok', recusado: 'no', devolvido: 'devol', pedido: 'pedido', alerta: 'alerta' };
  return map[tipo] || 'pedido';
}

export default function Notificacoes() {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notificacoes')
      .then(data => { setNotifs(Array.isArray(data) ? data : data.notificacoes || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function lerTodas() {
    try {
      await api.patch('/notificacoes/ler-todas');
      setNotifs(n => n.map(x => ({ ...x, lida: true })));
    } catch {}
  }

  async function lerUma(id) {
    try {
      await api.patch(`/notificacoes/${id}/ler`);
      setNotifs(n => n.map(x => x.id === id ? { ...x, lida: true } : x));
    } catch {}
  }

  const naoLidas = notifs.filter(n => !n.lida).length;

  if (loading) return (
    <div className="loading-full">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
        Carregando notificações…
      </div>
    </div>
  );

  return (
    <>
      <div className="section-header">
        <h3>
          Notificações
          {naoLidas > 0 && (
            <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>{naoLidas}</span>
          )}
        </h3>
        {naoLidas > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={lerTodas}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18"/></svg>
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notifs.length === 0
        ? <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>Nenhuma notificação ainda.</p>
            <small>Aprovações, devoluções e alertas aparecerão aqui em tempo real.</small>
          </div>
        : <div className="notif-list">
            {notifs.map(n => (
              <div
                key={n.id}
                className={`notif-item${!n.lida ? ' unread' : ''}`}
                onClick={() => !n.lida && lerUma(n.id)}
                style={{ cursor: !n.lida ? 'pointer' : 'default' }}
              >
                <div className={`notif-icon ${tipoCls(n.tipo)}`}>{tipoIcon(n.tipo)}</div>
                <div className="notif-body">
                  <div className="notif-title">{n.titulo}</div>
                  {n.corpo && <div className="notif-sub">{n.corpo}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className="notif-time">{tempoAtras(n.criadoEm)}</div>
                  {!n.lida && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--verde)' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
      }
    </>
  );
}
