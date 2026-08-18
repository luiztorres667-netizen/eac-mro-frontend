import { useState, useRef } from 'react';
import { useAuth }    from '../contexts/AuthContext';
import { usePedidos } from '../hooks/usePedidos';
import { api }        from '../api';

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

function fmtData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch { return iso; }
}

function diasRestantes(devISO) {
  if (!devISO) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const dev  = new Date(devISO + 'T00:00:00');
  return Math.round((dev - hoje) / 86400000);
}

/* ══════════════════════════════════════
   PEDIDO CARD
══════════════════════════════════════ */
function PedidoCard({ p, onDetalhe, onAprovar, onRecusar, onDevolver, onEstender, perm }) {
  const dias = diasRestantes(p.devISO);

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
          <div className="pedido-partes">
            <span className="parte-chip">{p.solicitante || p.criadoPorNome || '—'}</span>
            <span className="arrow">→</span>
            <span className="parte-chip">{p.concedente || '—'}</span>
            {p.mgSolicitante && <span className="parte-chip" style={{ color: 'var(--indigo)', borderColor: 'var(--indigo)' }}>{p.mgSolicitante}</span>}
            {p.mgConcedente  && <span className="parte-chip" style={{ color: 'var(--verde)',  borderColor: 'var(--verde)'  }}>{p.mgConcedente}</span>}
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
          <div className="info-value">{fmtData(p.criadoEm?.toDate ? p.criadoEm.toDate().toISOString().slice(0,10) : p.criadoEm)}</div>
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
      {p.materiais?.length > 0 && (
        <div className="pedido-materiais">
          📦 {p.materiais.join(' · ')}
        </div>
      )}

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
  const [saving, setSaving]     = useState(false);
  const [materiais, setMateriais] = useState(['']);
  const [form, setForm]         = useState({
    numeroPedido: '', solicitante: user?.nome || '', concedente: '',
    produto: '', produtoConcedente: '', mgSolicitante: '', mgConcedente: '',
    devISO: '', observacao: '', tipo: 'Empréstimo',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addMaterial()    { setMateriais(m => [...m, '']); }
  function setMaterial(i,v) { setMateriais(m => m.map((x,j) => j===i ? v : x)); }
  function removeMaterial(i){ setMateriais(m => m.filter((_,j) => j!==i)); }

  async function salvar() {
    if (!form.produto.trim()) { alert('Informe o produto solicitante.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        materiais: materiais.filter(m => m.trim()),
        criadoPor: user?.uid,
        criadoPorNome: user?.nome || user?.email,
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
            <label>Número do pedido <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <input type="text" value={form.numeroPedido} onChange={e => set('numeroPedido', e.target.value)} placeholder="Ex: 0001, OS-4521…" />
          </div>

          {/* Solicitante + Concedente */}
          <div className="field-row">
            <div className="field">
              <label>Solicitante</label>
              <input type="text" value={form.solicitante} onChange={e => set('solicitante', e.target.value)} placeholder="Nome de quem solicita" />
            </div>
            <div className="field">
              <label>Concedente</label>
              <input type="text" value={form.concedente} onChange={e => set('concedente', e.target.value)} placeholder="Nome do concedente" />
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
            <input type="text" value={form.produto} onChange={e => set('produto', e.target.value)} placeholder="Ex: Acervo Dressing — Figurinos Épocas" />
          </div>

          {/* Produto concedente + MG */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Produto Concedente <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></span>
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
            <input type="text" value={form.produtoConcedente} onChange={e => set('produtoConcedente', e.target.value)} placeholder="Identificação/código interno do concedente" />
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
            <label>Observação <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
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
            Confirme a aprovação do empréstimo de <strong>{pedido.produto}</strong> para <strong>{pedido.solicitante}</strong>.
          </p>
          <div className="field">
            <label>Data de devolução</label>
            <input type="date" value={devISO} onChange={e => setDevISO(e.target.value)} />
            <div className="field-hint">Deixe em branco se não houver prazo definido.</div>
          </div>
          <div className="field">
            <label>Observação da aprovação <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
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
            Confirmando a devolução de <strong>{pedido.produto}</strong> de <strong>{pedido.solicitante}</strong>.
          </p>

          <div className="field">
            <label>Observação da devolução <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Estado do material, comentários…" rows={3} />
          </div>

          {/* Foto comprovante */}
          <div className="field">
            <label>Foto comprovante <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
            <div className="foto-upload" onClick={() => fileRef.current?.click()}>
              {foto
                ? <span style={{ color: 'var(--verde)' }}>📎 {foto.name}</span>
                : <>
                    <span className="icon">📷</span>
                    Clique para anexar foto da devolução
                  </>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setFoto(e.target.files?.[0] || null)} />
          </div>

          <hr className="sep" />

          {/* Ocorrência toggle */}
          <div
            className={`ocorr-toggle${ocorrencia ? ' ativo' : ''}`}
            onClick={() => setOcorr(o => !o)}
          >
            <span className="toggle-icon">⚠️</span>
            <div className="toggle-label">
              <strong>Registrar ocorrência</strong>
              <span>Avaria, perda, atraso ou outro problema</span>
            </div>
            <div className={`toggle-chk${ocorrencia ? ' on' : ''}`} />
          </div>

          {ocorrencia && (
            <div className="ocorr-fields show" style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
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
            <div style={{ fontSize: 18, fontWeight: 800 }}>{pedido.produto}</div>
            {pedido.numeroPedido && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>#{pedido.numeroPedido}</div>}
          </div>

          <hr className="sep" />

          {/* Grid de info */}
          <div className="pedido-info" style={{ marginBottom: 16 }}>
            <div><div className="info-label">Solicitante</div><div className="info-value">{pedido.solicitante || '—'}</div></div>
            <div><div className="info-label">Concedente</div><div className="info-value">{pedido.concedente || '—'}</div></div>
            {pedido.mgSolicitante && <div><div className="info-label">MG Sol.</div><div className="info-value">{pedido.mgSolicitante}</div></div>}
            {pedido.mgConcedente  && <div><div className="info-label">MG Con.</div><div className="info-value">{pedido.mgConcedente}</div></div>}
            <div><div className="info-label">Criado em</div><div className="info-value">{fmtData(pedido.criadoEm?.toDate ? pedido.criadoEm.toDate().toISOString().slice(0,10) : pedido.criadoEm)}</div></div>
            {pedido.devISO && <div><div className="info-label">Devolução</div><div className={`info-value ${diasRestantes(pedido.devISO) < 0 ? 'err' : 'ok'}`}>{fmtData(pedido.devISO)}</div></div>}
          </div>

          {/* Produto concedente */}
          {pedido.produtoConcedente && (
            <div className="field" style={{ marginBottom: 12 }}>
              <div className="info-label">Produto Concedente</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{pedido.produtoConcedente}</div>
            </div>
          )}

          {/* Materiais */}
          {pedido.materiais?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="info-label" style={{ marginBottom: 6 }}>Materiais</div>
              <div className="pedido-materiais">
                {pedido.materiais.map((m, i) => <div key={i}>• {m}</div>)}
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
            <div className="ocorrencia-box">
              <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ {pedido.ocorrencia.tipo}</div>
              {pedido.ocorrencia.descricao && <div style={{ fontWeight: 500 }}>{pedido.ocorrencia.descricao}</div>}
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
  const { perm } = useAuth();
  const [tab, setTab]       = useState('Todos');
  const [busca, setBusca]   = useState('');

  // Modais
  const [modalNovo,     setModalNovo]     = useState(false);
  const [modalDetalhe,  setModalDetalhe]  = useState(null);
  const [modalAprovar,  setModalAprovar]  = useState(null);
  const [modalRecusar,  setModalRecusar]  = useState(null);
  const [modalDevolver, setModalDevolver] = useState(null);
  const [modalEstender, setModalEstender] = useState(null);

  const filtro = TAB_STATUS[tab] ? { status: TAB_STATUS[tab] } : {};
  const { pedidos, loading, error, carregar: refresh } = usePedidos(filtro);

  // Filtragem local por busca
  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      p.produto?.toLowerCase().includes(q) ||
      p.solicitante?.toLowerCase().includes(q) ||
      p.concedente?.toLowerCase().includes(q) ||
      p.numeroPedido?.toLowerCase().includes(q)
    );
  });

  // Contagens para badges
  const nPendentes = pedidos.filter(p => p.status === 'pendente').length;

  function fecharTudo() {
    setModalNovo(false); setModalDetalhe(null); setModalAprovar(null);
    setModalRecusar(null); setModalDevolver(null); setModalEstender(null);
  }

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
      {/* ── Cabeçalho da página ── */}
      <div className="section-header">
        <div className="module-tabs">
          {TABS_EAC.map(t => (
            <div
              key={t}
              className={`module-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
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

      {/* ── Busca ── */}
      <div className="busca-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="busca-input"
          type="text"
          placeholder="Buscar por produto, solicitante, concedente ou código…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* ── Lista ── */}
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
      {modalNovo     && <ModalNovoPedido onClose={() => setModalNovo(false)} onSalvo={refresh} />}
      {modalDetalhe  && <ModalDetalhe   pedido={modalDetalhe}  onClose={() => setModalDetalhe(null)} />}
      {modalAprovar  && <ModalAprovar   pedido={modalAprovar}  onClose={() => setModalAprovar(null)}  onFeito={refresh} />}
      {modalRecusar  && <ModalRecusar   pedido={modalRecusar}  onClose={() => setModalRecusar(null)}  onFeito={refresh} />}
      {modalDevolver && <ModalDevolver  pedido={modalDevolver} onClose={() => setModalDevolver(null)} onFeito={refresh} />}
      {modalEstender && <ModalEstender  pedido={modalEstender} onClose={() => setModalEstender(null)} onFeito={refresh} />}
    </>
  );
}
