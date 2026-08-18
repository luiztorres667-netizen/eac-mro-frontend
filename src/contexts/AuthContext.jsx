import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut }                    from 'firebase/auth';
import { doc, getDoc }                                    from 'firebase/firestore';
import { auth, db }    from '../firebase';
import { permissoesApi, usuariosApi } from '../api';

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
      // Busca cargo diretamente do Firestore pelo UID (fonte de verdade)
      let firestoreUser = {};
      try {
        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
        if (snap.exists()) firestoreUser = snap.data();
      } catch { /* sem acesso ao Firestore, continua sem cargo */ }

      // Busca permissões + dados do usuário na API
      try {
        const dados = await permissoesApi.obter();
        setPermState(dados.permState   || {});
        setCargoKeyMap(dados.cargoKeyMap || {});
        setSetores(dados.setores        || []);

        // Se o backend não retornou currentUser (ou veio sem cargo),
        // busca os dados do usuário logado na lista de usuários pelo email
        let currentUser = dados.currentUser || {};
        if (!currentUser.cargo) {
          try {
            const lista = await usuariosApi.listar();
            const meusDados = lista.find(u => u.email === firebaseUser.email);
            if (meusDados) currentUser = { ...currentUser, ...meusDados };
          } catch { /* sem acesso à lista, continua sem cargo */ }
        }

        // Firestore tem prioridade sobre o que o backend retorna para cargo/nome
        setUser({
          email: firebaseUser.email,
          ...currentUser,
          ...firestoreUser,          // sobrescreve cargo, nome, etc. com dados frescos do Firestore
        });
      } catch {
        // Se a API falhar, usa apenas dados do Firestore
        setUser({ email: firebaseUser.email, ...firestoreUser });
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
