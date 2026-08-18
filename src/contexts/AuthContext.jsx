import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut }                    from 'firebase/auth';
import { auth }         from '../firebase';
import { permissoesApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null);   // { email, cargo, setor, nome }
  const [permState,  setPermState]  = useState({});
  const [cargoKeyMap,setCargoKeyMap]= useState({});
  const [setores,    setSetores]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  // Escuta mudança de auth do Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Busca permissões + dados do usuário na API
      try {
        const dados = await permissoesApi.obter();
        setPermState(dados.permState   || {});
        setCargoKeyMap(dados.cargoKeyMap || {});
        setSetores(dados.setores        || []);
        // O cargo/setor/nome vêm do token decodificado pelo backend
        // e a API retorna no contexto. Por ora, busca via /api/usuarios/me
        // (simplificado: usamos o que vem do permState)
        setUser({ email: firebaseUser.email, ...dados.currentUser });
      } catch {
        // Se a API falhar, mantém o usuário do Firebase sem dados extras
        setUser({ email: firebaseUser.email });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Verifica permissão do usuário atual
  function perm(permId) {
    if (!user) return false;
    if (user.cargo === 'Admin') return true;
    // Se permState veio vazio da API, libera tudo para não bloquear navegação (setup inicial)
    if (Object.keys(permState).length === 0) return true;

    // Formato cargo→perm: { "Usuário": { "rel_ver": true, ... } }
    const cargoPerm = permState[user.cargo];
    if (cargoPerm !== undefined) return !!cargoPerm[permId];

    // Fallback: formato perm→cargo: { "rel_ver": { "usuario": true } }
    const item = permState[permId];
    if (!item) return false;
    const cargoKey = cargoKeyMap[user.cargo] || user.cargo || user.cargo?.toLowerCase() || 'mutuario';
    return !!item[cargoKey];
  }

  function logout() {
    return signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, perm, permState, setores, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
