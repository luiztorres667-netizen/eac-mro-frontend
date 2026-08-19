import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ── Ícones SVG inline ── */
const IconEAC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconRelatorios = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);
const IconUsuarios = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconNotif = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconSair = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

/* ── Logo MRO ── */
function LogoMRO({ collapsed }) {
  return (
    <div className="logo-mro">
      <span className="logo-letters">MR</span>
      {/* O — anel verde com ponto branco (identidade MRO) */}
      <svg className="logo-o-svg" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" fill="#00ce7c"/>
        <circle cx="14" cy="14" r="7" fill="var(--surface)"/>
        <circle cx="14" cy="14" r="2.8" fill="white"/>
      </svg>
    </div>
  );
}

/* ── Topbar com data atual ── */
function Topbar({ title }) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
  return (
    <div className="topbar">
      <h2>{title}</h2>
      <span className="topbar-date">{hoje}</span>
    </div>
  );
}

/* ── Títulos por rota ── */
const TITLES = {
  '/':           'Controle EAC — Empréstimos',
  '/relatorios': 'Relatórios',
  '/usuarios':   'Usuários & Permissões',
  '/notificacoes': 'Notificações',
};

export default function Layout() {
  const { user, perm, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const pathname = window.location.pathname;
  const title = TITLES[pathname] || 'MRO — Controle';

  const iniciais = user?.nome
    ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app">
      {/* ══ SIDEBAR ══ */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Botão recolher */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <IconChevron />
        </button>

        {/* Marca */}
        <div className="sidebar-brand">
          <LogoMRO collapsed={collapsed} />
          <div className="sidebar-collapsible">
            <div className="logo-tagline">
              nós ativamos a <span>eficiência</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-app-label sidebar-collapsible">Sistema</div>

        <nav className="nav-list">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title="Controle EAC"
          >
            <IconEAC />
            <span className="nav-label sidebar-collapsible">EAC</span>
          </NavLink>

          {perm('notif_ver') && (
            <NavLink
              to="/notificacoes"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Notificações"
            >
              <IconNotif />
              <span className="nav-label sidebar-collapsible">Notificações</span>
            </NavLink>
          )}

          {perm('rel_ver') && (
            <NavLink
              to="/relatorios"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Relatórios"
            >
              <IconRelatorios />
              <span className="nav-label sidebar-collapsible">Relatórios</span>
            </NavLink>
          )}

          {perm('usr_ver') && (
            <NavLink
              to="/usuarios"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title="Usuários"
            >
              <IconUsuarios />
              <span className="nav-label sidebar-collapsible">Usuários</span>
            </NavLink>
          )}
        </nav>

        {/* Footer com usuário */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{iniciais}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{user?.nome || user?.email}</div>
                <div className="user-role">{user?.cargo || 'Usuário'}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Sair"
              style={{
                background: 'transparent', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', padding: '4px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', transition: 'color .15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              <IconSair />
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="main">
        <Topbar title={title} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
