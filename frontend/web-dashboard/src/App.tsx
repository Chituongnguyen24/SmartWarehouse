import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import IoTMonitoring from './pages/IoTMonitoring';
import AIAlerts from './pages/AIAlerts';
import FEFOExport from './pages/FEFOExport';
import DemandForecast from './pages/DemandForecast';
import TransportOptimization from './pages/TransportOptimization';
import Reports from './pages/Reports';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import ShelfArrangement from './pages/ShelfArrangement';

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="iot" element={<IoTMonitoring />} />
            <Route path="ai-alerts" element={<AIAlerts />} />
            <Route path="fefo" element={<FEFOExport />} />
            <Route path="demand-forecast" element={<DemandForecast />} />
            <Route path="transport" element={<TransportOptimization />} />
            <Route path="shelf" element={<ShelfArrangement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Users />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
