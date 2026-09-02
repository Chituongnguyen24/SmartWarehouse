import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import StaffManagement from './pages/StaffManagement';
import OrderDispatch from './pages/OrderDispatch';
import AIAlerts from './pages/AIAlerts';
import InboundOrder from './pages/InboundOrder';
import OutboundOrder from './pages/OutboundOrder';
import WarehouseDispatch from './pages/WarehouseDispatch';
import OrderManagement from './pages/OrderManagement';
import SalesManagement from './pages/SalesManagement';
import AdminControlCenter from './pages/AdminControlCenter';
import DemandForecast from './pages/DemandForecast';
import TransportOptimization from './pages/TransportOptimization';
import Reports from './pages/Reports';
import UserProfile from './pages/UserProfile';
import Users from './pages/Users';
import ShelfArrangement from './pages/ShelfArrangement';
import Settings from './pages/Settings';
import CustomerLayout from './components/layout/CustomerLayout';
import CustomerStorefront from './pages/CustomerStorefront';
import CustomerCart from './pages/CustomerCart';
import CustomerOrders from './pages/CustomerOrders';
import CustomerProductDetail from './pages/CustomerProductDetail';
import CustomerProfile from './pages/CustomerProfile';
import { WebCartProvider } from './contexts/WebCartContext';
import { WarehouseProvider } from './contexts/WarehouseContext';
import InboundOrders from './pages/InboundOrders';
import OutboundOrders from './pages/OutboundOrders';
import FEFOExport from './pages/FEFOExport';
import { Warehouse3DDigitalTwin } from './components/Warehouse3DDigitalTwin';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

const DashboardIndex = () => {
  const { user } = useAuth();
  if (user?.role === 'DRIVER') {
    return <Navigate to="/transport" replace />;
  }
  if (user?.role === 'WAREHOUSE_STAFF') {
    return <Navigate to="/orders" replace />;
  }
  if (user?.role === 'WAREHOUSE_MANAGER') {
    return <Navigate to="/inventory" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <WarehouseProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

          {/* Protected routes for Admin/Staff */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'DRIVER']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <DashboardIndex />
              </ProtectedRoute>
            } />
            <Route path="products" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Products />
              </ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="warehouse-3d" element={<Navigate to="/inventory?tab=3d" replace />} />
            <Route path="staff" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']}>
                <StaffManagement />
              </ProtectedRoute>
            } />
            <Route path="orders" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OrderDispatch />
              </ProtectedRoute>
            } />
            <Route path="customer-orders" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OrderDispatch />
              </ProtectedRoute>
            } />
            <Route path="ai-alerts" element={
              <ProtectedRoute allowedRoles={['WAREHOUSE_MANAGER']}>
                <AIAlerts />
              </ProtectedRoute>
            } />
            <Route path="fefo" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <FEFOExport />
              </ProtectedRoute>
            } />
            <Route path="inbound" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <InboundOrders />
              </ProtectedRoute>
            } />
            <Route path="outbound" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OutboundOrders />
              </ProtectedRoute>
            } />
            <Route path="outbound-orders" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OutboundOrders />
              </ProtectedRoute>
            } />
            <Route path="dispatch" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <WarehouseDispatch />
              </ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES_STAFF', 'WAREHOUSE_MANAGER']}>
                <SalesManagement />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminControlCenter />
              </ProtectedRoute>
            } />
            <Route path="demand-forecast" element={
              <ProtectedRoute allowedRoles={['SALES_STAFF']}>
                <DemandForecast />
              </ProtectedRoute>
            } />
            <Route path="transport" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'DRIVER']}>
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

          {/* Protected routes for Customer */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <WebCartProvider>
                <CustomerLayout />
              </WebCartProvider>
            </ProtectedRoute>
          }>
            <Route path="store" element={<CustomerStorefront />} />
            <Route path="product/:id" element={<CustomerProductDetail />} />
            <Route path="cart" element={<CustomerCart />} />
            <Route path="my-orders" element={<CustomerOrders />} />
            <Route path="my-profile" element={<CustomerProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </WarehouseProvider>
    </AuthProvider>
  );
}

export default App;
