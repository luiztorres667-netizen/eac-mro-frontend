import { useState, useEffect, useCallback } from 'react';
import { usuariosApi } from '../api';

export function useUsuarios() {
  const [usuarios,      setUsuarios]      = useState([]);
  const [solicitacoes,  setSolicitacoes]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, s] = await Promise.all([
        usuariosApi.listar(),
        usuariosApi.listarSolicitacoes().catch(() => []),
      ]);
      setUsuarios(u);
      setSolicitacoes(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criar            = async (dados)       => { await usuariosApi.criar(dados);                      await carregar(); };
  const atualizarCargo   = async (id, cargo)   => { await usuariosApi.atualizarCargo(id, cargo);         await carregar(); };
  const excluir          = async (id)          => { await usuariosApi.excluir(id);                       await carregar(); };
  const aprovarSolic     = async (id, cargo)   => { await usuariosApi.aprovarSolicitacao(id, cargo);     await carregar(); };
  const recusarSolic     = async (id)          => { await usuariosApi.recusarSolicitacao(id);            await carregar(); };

  return { usuarios, solicitacoes, loading, error, carregar, criar, atualizarCargo, excluir, aprovarSolic, recusarSolic };
}
