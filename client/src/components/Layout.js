import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaHome, FaUsers, FaCalendarCheck,
  FaUsersCog,
  FaBars, FaTimes, FaSignOutAlt, FaEnvelope, FaChevronDown, FaChevronRight,
  FaHistory
} from 'react-icons/fa';
import './Layout.css';

const Layout = () => {
  // Sidebar siempre abierto en desktop, solo colapsable en mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sigapOpen, setSigapOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Manejo de responsive - solo en mobile
  useEffect(() => {
    const handleResize = () => {
      // Solo cerrar sidebar automáticamente en mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard', type: 'link' },
    {
      label: 'SIGAP',
      icon: <FaUsers />,
      type: 'group',
      expanded: sigapOpen,
      toggle: () => setSigapOpen(!sigapOpen),
      children: [
        { path: '/employees', icon: <FaUsers />, label: 'Registro de Empleados' },
        { path: '/attendance', icon: <FaCalendarCheck />, label: 'Asistencias' },
        { path: '/emails', icon: <FaEnvelope />, label: 'Correos' },
        { path: '/email-history', icon: <FaHistory />, label: 'Historial de Correos' }
      ]
    },
    { path: '/users', icon: <FaUsersCog />, label: 'Usuarios Admin', type: 'link', adminOnly: true }
  ];

  const filteredMenuItems = menuItems.filter(item =>
    !item.adminOnly || user?.role === 'admin'
  );

  // Cerrar sidebar en mobile al hacer clic en un enlace
  const handleMenuItemClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const renderMenuItem = (item) => {
    if (item.type === 'group') {
      return (
        <div key={item.label} className="menu-group">
          <div
            className="menu-group-header"
            onClick={item.toggle}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="expand-icon">
              {item.expanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
            </span>
          </div>
          {item.expanded && (
            <div className="menu-group-items">
              {item.children.map(child => {
                // Filtrar items según rol
                if (child.adminOnly && user?.role !== 'admin') return null;
                if (child.adminCoordinadorOnly && user?.role !== 'admin' && user?.role !== 'coordinador') return null;

                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={`nav-item nav-item-child ${location.pathname === child.path ? 'active' : ''}`}
                    onClick={handleMenuItemClick}
                  >
                    <span className="nav-icon">{child.icon}</span>
                    <span className="nav-label">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        onClick={handleMenuItemClick}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="layout">
      {/* Overlay para cerrar sidebar en mobile */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">S</div>
            <span className="logo-text">SIAF</span>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredMenuItems.map(renderMenuItem)}
        </nav>
      </aside>

      <div className={`main-content ${sidebarOpen ? 'with-sidebar' : 'without-sidebar'}`}>
        <header className="top-header">
          <div className="header-left">
            {/* Botón solo visible en mobile */}
            <button
              className="menu-toggle mobile-only"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir menú"
            >
              <FaBars size={20} />
            </button>
            <h1 className="page-title">Sistema Integral de Administración Facultativa</h1>
          </div>

          <div className="header-right">
            <div className="profile-dropdown">
              <button
                className="profile-button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="profile-avatar">
                  {user?.nombre?.charAt(0)}{user?.apellido_paterno?.charAt(0)}
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="profile-info">
                      <span className="user-name">
                        {user?.nombre} {user?.apellido_paterno}
                      </span>
                      <span className="user-role">{user?.role}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={logout}>
                    <FaSignOutAlt />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
