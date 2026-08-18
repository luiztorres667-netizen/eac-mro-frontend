import { useState, useEffect, useCallback } from 'react';
import { pedidosApi } from '../api';

export function usePedidos(filtros = {}) {
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pedidosApi.listar(filtros);
      setPedidos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filtros)]);

  useEffect(() => { carregar(); }, [carregar]);

  const aprovar   = async (id)              => { await pedidosApi.aprovar(id);            await carregar(); };
  const recusar   = async (id, motivo)      => { await pedidosApi.recusar(id, motivo);    await carregar(); };
  const devolver  = async (id, dados)       => { await pedidosApi.devolver(id, dados);    await carregar(); };
  const estender  = async (id, novaData)    => { await pedidosApi.estender(id, novaData); await carregar(); };
  const criar     = async (dados)           => { await pedidosApi.criar(dados);            await carregar(); };
  const excluir   = async (id)              => { await pedidosApi.excluir(id);             await carregar(); };

  return { pedidos, loading, error, carregar, aprovar, recusar, devolver, estender, criar, excluir };
}
