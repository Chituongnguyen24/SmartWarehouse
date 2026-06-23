import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Wifi, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  Truck, 
  Layers, 
  BarChart3, 
  Users,
  Leaf
} from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Leaf size={20} />
        </div>
        <div className="brand-info">
          <h1>FreshKeep</h1>
          <p>Kho thực phẩm thông minh</p>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">VẬN HÀNH</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Tổng quan</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={18} />
          <span>Sản phẩm & SKU</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Boxes size={18} />
          <span>Kho & lô hàng</span>
        </NavLink>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">GIÁM SÁT & AI</div>
        <NavLink to="/iot" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Wifi size={18} />
          <span>Giám sát IoT</span>
        </NavLink>
        <NavLink to="/ai-alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <AlertTriangle size={18} />
          <span>Cảnh báo AI</span>
          <span className="nav-badge">7</span>
        </NavLink>
        <NavLink to="/fefo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ArrowUpRight size={18} />
          <span>Xuất kho FEFO</span>
        </NavLink>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">TỐI ƯU</div>
        <NavLink to="/demand-forecast" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <TrendingUp size={18} />
          <span>Dự báo nhu cầu</span>
        </NavLink>
        <NavLink to="/transport" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={18} />
          <span>Tối ưu vận chuyển</span>
        </NavLink>
        <div className="nav-item">
          <Layers size={18} />
          <span>Sắp xếp kệ</span>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">HỆ THỐNG</div>
        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>Báo cáo</span>
        </NavLink>
        <div className="nav-item">
          <Users size={18} />
          <span>Người dùng</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="iot-status-card">
          <div className="status-dot"></div>
          <div className="iot-status-text">
            <strong>12 cảm biến IoT</strong>
            đang truyền dữ liệu
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
