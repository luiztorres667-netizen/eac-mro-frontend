import { getAuth } from 'firebase/auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(method, path, body) {
  const auth  = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }

  return data;
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
};

// ── Pedidos ──
export const pedidosApi = {
  listar:     (params = {}) => api.get('/pedidos?' + new URLSearchParams(params)),
  buscar:     (id)          => api.get(`/pedidos/${id}`),
  criar:      (dados)       => api.post('/pedidos', dados),
  aprovar:    (id)          => api.patch(`/pedidos/${id}/aprovar`),
  recusar:    (id, motivo)  => api.patch(`/pedidos/${id}/recusar`, { motivo }),
  devolver:   (id, dados)   => api.patch(`/pedidos/${id}/devolver`, dados),
  estender:   (id, data)    => api.patch(`/pedidos/${id}/estender`, { novaData: data }),
  excluir:    (id)          => api.delete(`/pedidos/${id}`),
};

// ── Usuários ──
export const usuariosApi = {
  listar:              ()             => api.get('/usuarios'),
  criar:               (dados)        => api.post('/usuarios', dados),
  atualizarCargo:      (id, cargo)    => api.patch(`/usuarios/${id}/cargo`, { cargo }),
  excluir:             (id)           => api.delete(`/usuarios/${id}`),
  listarSolicitacoes:  ()             => api.get('/usuarios/solicitacoes'),
  enviarSolicitacao:   (dados)        => api.post('/usuarios/solicitacoes', dados),
  aprovarSolicitacao:  (id, cargo)    => api.patch(`/usuarios/solicitacoes/${id}/aprovar`, { cargo }),
  recusarSolicitacao:  (id)           => api.patch(`/usuarios/solicitacoes/${id}/recusar`),
};

// ── Permissões ──
export const permissoesApi = {
  obter:               ()             => api.get('/permissoes'),
  salvar:              (permState)    => api.put('/permissoes', { permState }),
  listarCargos:        ()             => api.get('/permissoes/cargos'),
  criarCargo:          (nome)         => api.post('/permissoes/cargos', { nome }),
  excluirCargo:        (id)           => api.delete(`/permissoes/cargos/${id}`),
};
