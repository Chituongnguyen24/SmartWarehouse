import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { BottomNavBar } from './components/BottomNavBar';
import { GlobalNotificationBanner } from './components/GlobalNotificationBanner';
import { DashboardHome } from './pages/DashboardHome';
import { PickingWave } from './pages/PickingWave';
import { OutboundShipping } from './pages/OutboundShipping';
import { InboundReceiving } from './pages/InboundReceiving';
import { PackingStation } from './pages/PackingStation';
import { StockLookup } from './pages/StockLookup';
import { Login } from './pages/Login';

const AppContent: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          gap: '12px',
          fontSize: '13px',
          fontWeight: 700,
        }}
      >
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span>Đang xác thực thông tin tài khoản kho...</span>
      </div>
    );
  }

  const isLoginPage = location.pathname === '/login';

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && isLoginPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        maxWidth: '540px',
        margin: '0 auto',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        position: 'relative',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.08)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Real-time Order Popup Banner (Only when logged in) */}
      {isAuthenticated && <GlobalNotificationBanner />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardHome />} />
        <Route path="/outbound" element={<OutboundShipping />} />
        <Route path="/picking" element={<PickingWave />} />
        <Route path="/inbound" element={<InboundReceiving />} />
        <Route path="/packing" element={<PackingStation />} />
        <Route path="/lookup" element={<StockLookup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Fixed Mobile Bottom Navigation (Only when logged in) */}
      {isAuthenticated && <BottomNavBar />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <AppContent />
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;

