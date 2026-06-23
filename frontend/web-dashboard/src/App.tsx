import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import IoTMonitoring from './pages/IoTMonitoring';
import AIAlerts from './pages/AIAlerts';
import FEFOExport from './pages/FEFOExport';
import DemandForecast from './pages/DemandForecast';
import TransportOptimization from './pages/TransportOptimization';
import Reports from './pages/Reports';

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="iot" element={<IoTMonitoring />} />
          <Route path="ai-alerts" element={<AIAlerts />} />
          <Route path="fefo" element={<FEFOExport />} />
          <Route path="demand-forecast" element={<DemandForecast />} />
          <Route path="transport" element={<TransportOptimization />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
