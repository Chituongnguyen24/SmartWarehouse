import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, PackageOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: string;
  orderCode: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  items: any[];
}

const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('http://localhost:3007/outbound-orders');
        if (res.ok) {
          const data = await res.json();
          // Filter orders for the current logged-in customer
          const customerOrders = data.filter((o: any) => 
            o.requestedBy === user?.id ||
            o.requesterName === user?.name ||
            o.customerName === user?.name ||
            user?.role === 'CUSTOMER'
          );
          setOrders(customerOrders);
        }
      } catch (error) {
        console.error('Lỗi khi lấy đơn hàng:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'PICKING': return '#3b82f6';
      case 'PACKED': return '#8b5cf6';
      case 'CONFIRMED': return '#10b981';
      case 'CANCELLED': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Đang xử lý';
      case 'PICKING': return 'Đang soạn hàng';
      case 'PACKED': return 'Đã đóng gói';
      case 'CONFIRMED': return 'Đang giao hàng';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải lịch sử đơn hàng...</div>;
  }

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <PackageOpen size={64} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>Chưa có đơn hàng nào</h2>
        <p style={{ color: '#64748b' }}>Bạn chưa đặt bất kỳ đơn hàng nào từ CityMart.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>
        Đơn hàng của tôi
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {orders.map(order => (
          <div key={order.id} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 700, color: '#1e293b', marginRight: '1rem' }}>{order.orderCode}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {new Date(order.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div style={{
                backgroundColor: getStatusColor(order.status) + '15',
                color: getStatusColor(order.status),
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {order.status === 'CONFIRMED' ? <CheckCircle size={14} /> : <Package size={14} />}
                {getStatusLabel(order.status)}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
                {order.items.map((item: any, index: number) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{item.requestedQuantity}x</span>
                      <span style={{ color: '#1e293b' }}>{item.productName} ({item.unit})</span>
                    </div>
                    <span style={{ fontWeight: 500, color: '#64748b' }}>
                      {formatPrice((item.price || 35000) * item.requestedQuantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '1rem'
              }}>
                <span style={{ color: '#64748b' }}>Tổng tiền ({order.items.length} sản phẩm)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                  {formatPrice(order.totalAmount || (order.items || []).reduce((acc: number, item: any) => acc + (item.price || 35000) * item.requestedQuantity, 0))}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrders;
