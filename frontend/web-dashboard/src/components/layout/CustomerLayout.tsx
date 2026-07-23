import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, ShoppingCart, User, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWebCart } from '../../contexts/WebCartContext';

const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { totalItemsCount } = useWebCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 2rem',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/store')}>
          <div style={{
            backgroundColor: '#10b981',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Leaf size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>CityMart</h1>
        </div>

        {/* NAVIGATION */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <NavLink
            to="/store"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? '#10b981' : '#64748b',
              fontWeight: isActive ? 700 : 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            })}
          >
            Sản phẩm
          </NavLink>
          <NavLink
            to="/my-orders"
            style={({ isActive }) => ({
              textDecoration: 'none',
              color: isActive ? '#10b981' : '#64748b',
              fontWeight: isActive ? 700 : 500,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            })}
          >
            <Package size={18} />
            Đơn hàng
          </NavLink>
        </nav>

        {/* RIGHT ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/cart')}>
            <ShoppingCart size={24} color="#475569" />
            {totalItemsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {totalItemsCount}
              </span>
            )}
          </div>

          <div
            onClick={() => navigate('/my-profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem', cursor: 'pointer' }}
            title="Xem hồ sơ cá nhân"
          >
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#e2e8f0',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} color="#475569" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{user?.name}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Khách hàng</span>
            </div>
          </div>
          <LogOut
            size={18}
            color="#ef4444"
            style={{ marginLeft: '10px', cursor: 'pointer' }}
            onClick={handleLogout}
            title="Đăng xuất"
          />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer style={{
        backgroundColor: '#1e293b',
        color: '#94a3b8',
        padding: '2rem',
        textAlign: 'center',
        fontSize: '0.875rem'
      }}>
        © 2026 CityMart Smart E-commerce. All rights reserved.
      </footer>
    </div>
  );
};

export default CustomerLayout;
