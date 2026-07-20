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
import InboundOrder from './pages/InboundOrder';
import OutboundOrder from './pages/OutboundOrder';
import WarehouseDispatch from './pages/WarehouseDispatch';
import DemandForecast from './pages/DemandForecast';
import TransportOptimization from './pages/TransportOptimization';
import Reports from './pages/Reports';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import ShelfArrangement from './pages/ShelfArrangement';
import Settings from './pages/Settings';

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
            <Route index element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="products" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Products />
              </ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="iot" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <IoTMonitoring />
              </ProtectedRoute>
            } />
            <Route path="ai-alerts" element={
              <ProtectedRoute allowedRoles={['WAREHOUSE_MANAGER']}>
                <AIAlerts />
              </ProtectedRoute>
            } />
            <Route path="inbound" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <InboundOrder />
              </ProtectedRoute>
            } />
            <Route path="outbound" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OutboundOrder />
              </ProtectedRoute>
            } />
            <Route path="dispatch" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <WarehouseDispatch />
              </ProtectedRoute>
            } />
            <Route path="demand-forecast" element={
              <ProtectedRoute allowedRoles={['SALES_STAFF']}>
                <DemandForecast />
              </ProtectedRoute>
            } />
            <Route path="transport" element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <TransportOptimization />
              </ProtectedRoute>
            } />
            <Route path="shelf" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_STAFF']}>
                <ShelfArrangement />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="profile" element={<UserProfile />} />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
