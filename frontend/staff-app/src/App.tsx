import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardHome } from './pages/DashboardHome';
import { PickingWave } from './pages/PickingWave';
import { InboundReceiving } from './pages/InboundReceiving';
import { PackingStation } from './pages/PackingStation';
import { StockLookup } from './pages/StockLookup';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div
          style={{
            minHeight: '100vh',
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: '#090d16',
            position: 'relative',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/picking" element={<PickingWave />} />
            <Route path="/inbound" element={<InboundReceiving />} />
            <Route path="/packing" element={<PackingStation />} />
            <Route path="/lookup" element={<StockLookup />} />
          </Routes>

          {/* Fixed Mobile Bottom Navigation */}
          <BottomNavBar />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
