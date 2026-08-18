import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, perm, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const iniciais = user?.nome
    ? user.nome.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-badge">MRO</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive}) => `nav-item ${isActive?'active':''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <span>EAC</span>
          </NavLink>

          {perm('rel_ver') && (
            <NavLink to="/relatorios" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Relatórios</span>
            </NavLink>
          )}

          {perm('usr_ver') && (
            <NavLink to="/usuarios" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span>Usuários</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{iniciais}</div>
          <div className="user-info">
            <div className="user-nome">{user?.nome || user?.email}</div>
            <div className="user-cargo">{user?.cargo}</div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Sair">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
