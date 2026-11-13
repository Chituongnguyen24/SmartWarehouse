import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, ProtectedRoute, CustomerLayout } from '@/shared';
import { AuthProvider, useAuth, LoginPage } from '@/features/auth';
import {
  Users,
  StaffManagement,
  SupplierManagement,
  UserProfile,
  AuditLog,
  AdminControlCenter,
  Settings,
} from '@/features/users';
import { Products, Categories, VoucherManagement } from '@/features/products';
import { Inventory, FEFOExport } from '@/features/inventory';
import { InboundOrders, InboundOrder, DemandForecast } from '@/features/inbound';
import { OutboundOrders, OutboundOrder } from '@/features/outbound';
import { WarehouseDispatch, ShelfArrangement, Warehouse3DDigitalTwin } from '@/features/warehouse';
import { TransportOptimization, OrderDispatch, CodReconciliation } from '@/features/transport';
import { SalesManagement, FlashSaleManagement, OrderManagement } from '@/features/sales';
import { Dashboard, Reports, AIAlerts } from '@/features/reports';
import {
  CustomerStorefront,
  CustomerCart,
  CustomerOrders,
  CustomerProductDetail,
  CustomerProfile,
  WebCartProvider,
} from '@/features/customer';
import { WarehouseProvider } from '@/shared';
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
  // WAREHOUSE_MANAGER and ADMIN both use the Manager Dashboard
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
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES_STAFF']}>
                <Products />
              </ProtectedRoute>
            } />
            <Route path="categories" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES_STAFF']}>
                <Categories />
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
            <Route path="order-dispatch" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SALES_STAFF']}>
                <OrderDispatch />
              </ProtectedRoute>
            } />
            <Route path="ai-alerts" element={
              <ProtectedRoute allowedRoles={['WAREHOUSE_MANAGER']}>
                <AIAlerts />
              </ProtectedRoute>
            } />
            <Route path="inbound" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <InboundOrders />
              </ProtectedRoute>
            } />
            <Route path="inbound-orders" element={
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
            <Route path="flash-sale" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES_STAFF']}>
                <FlashSaleManagement />
              </ProtectedRoute>
            } />
            <Route path="vouchers" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES_STAFF']}>
                <VoucherManagement />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminControlCenter />
              </ProtectedRoute>
            } />
            <Route path="demand-forecast" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'SALES_STAFF']}>
                <DemandForecast />
              </ProtectedRoute>
            } />
            <Route path="replenishment" element={<Navigate to="/demand-forecast" replace />} />
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
            <Route path="cod-reconciliation" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']}>
                <CodReconciliation />
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
            <Route path="suppliers" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SupplierManagement />
              </ProtectedRoute>
            } />
            <Route path="audit-log" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AuditLog />
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
