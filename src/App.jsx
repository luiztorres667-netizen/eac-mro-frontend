import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import Login         from './pages/Login';
import Emprestimos   from './pages/Emprestimos';
import Relatorios    from './pages/Relatorios';
import Usuarios      from './pages/Usuarios';
import Notificacoes  from './pages/Notificacoes';
import Layout        from './components/Layout';

function PrivateRoute({ children, permId }) {
  const { user, perm, loading } = useAuth();

  if (loading) return <div className="loading-full">Carregando…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (permId && !perm(permId)) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-full">Carregando…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index          element={<Emprestimos />} />
        <Route path="relatorios" element={
          <PrivateRoute permId="rel_ver"><Relatorios /></PrivateRoute>
        } />
        <Route path="usuarios" element={
          <PrivateRoute permId="usr_ver"><Usuarios /></PrivateRoute>
        } />
        <Route path="notificacoes" element={
          <PrivateRoute permId="notif_ver"><Notificacoes /></PrivateRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
