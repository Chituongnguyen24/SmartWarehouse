import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/': return 'Quản lý Kho hàng';
    case '/dispatch': return 'Tiếp nhận & Phân phối đơn (Dispatch Hub)';
    case '/sales': return 'Quản lý Bán hàng & Chat Hỗ trợ';
    case '/products': return 'Sản phẩm & SKU';
    case '/inventory': return 'Quản lý Kho hàng';
    case '/staff': return 'Nhân viên Trực kho';
    case '/orders': return 'Điều phối Đơn hàng theo Kho';
    case '/ai-alerts': return 'Cảnh báo AI';
    case '/inbound': return 'Quản lý Nhập kho';
    case '/outbound': return 'Quản lý Xuất kho & FEFO';
    case '/demand-forecast': return 'Dự báo nhu cầu';
    case '/transport': return 'Tối ưu vận chuyển';
    case '/reports': return 'Báo cáo & Phân tích';
    case '/profile': return 'Thông tin tài khoản';
    case '/users': return 'Quản lý người dùng';
    default: return 'Tiếp nhận & Phân phối đơn';
  }
};

const MainLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  let title = getPageTitle(location.pathname);

  if (user?.role === 'DRIVER' && location.pathname === '/transport') {
    title = 'Đơn hàng của tôi';
  }

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
