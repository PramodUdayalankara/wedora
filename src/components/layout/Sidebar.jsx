import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Users,
  Package,
  CreditCard,
  Truck,
  BarChart3,
  Receipt,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand" style={{ padding: '0.85rem 1.25rem', height: 'auto', minHeight: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/logo.png"
            alt="Wedora Fine Chocolate"
            style={{
              height: '46px',
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))'
            }}
          />
        </div>

        {/* Quick New Order Button */}
        <div style={{ padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
          <button
            onClick={() => {
              navigate('/orders/new');
              onClose();
            }}
            className="btn btn-gold"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-gold)',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <PlusCircle size={18} />
            <span>+ New Order</span>
          </button>
        </div>

        {/* Simplified Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <LayoutDashboard size={19} />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/orders" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <ShoppingBag size={19} />
                <span>Orders</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/deliveries" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Truck size={19} />
                <span>Deliveries</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/customers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Users size={19} />
                <span>Customers</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Package size={19} />
                <span>Chocolates & Prices</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <CreditCard size={19} />
                <span>Payments & Invoices</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/expenses" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Receipt size={19} />
                <span>Other Expenses</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <BarChart3 size={19} />
                <span>Sales Reports</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Settings size={19} />
                <span>Settings & Backup</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* User Mini Profile Footer */}
        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="user-avatar-circle">
              {user?.full_name ? user.full_name[0] : 'A'}
            </div>
            <div className="user-mini-details">
              <div className="user-mini-name">{user?.full_name || 'Administrator'}</div>
              <div className="user-mini-role">ADMINISTRATOR</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '0.4rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
