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

          {/* Protected routes for Admin/Staff */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'DRIVER']}>
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
    </AuthProvider>
  );
}

export default App;
