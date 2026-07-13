import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/': return 'Tổng quan';
    case '/products': return 'Sản phẩm & SKU';
    case '/inventory': return 'Kho & lô hàng';
    case '/iot': return 'Giám sát IoT';
    case '/ai-alerts': return 'Cảnh báo AI';
    case '/inbound': return 'Quản lý Nhập kho';
    case '/outbound': return 'Quản lý Xuất kho & FEFO';
    case '/demand-forecast': return 'Dự báo nhu cầu';
    case '/transport': return 'Tối ưu vận chuyển';
    case '/reports': return 'Báo cáo & Phân tích';
    case '/profile': return 'Thông tin tài khoản';
    case '/users': return 'Quản lý người dùng';
    default: return 'Tổng quan';
  }
};

const MainLayout = () => {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-wrapper">
        <Header title={title} />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
