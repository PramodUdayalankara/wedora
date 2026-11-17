import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService, orderService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatPhoneNumber, getWhatsAppUrl } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import {
  ArrowLeft,
  Plus,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Eye,
  ShoppingBag,
  Clock,
  Search,
  Trash2
} from 'lucide-react';

export const CustomerDetails = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrder, setSearchOrder] = useState('');

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { refreshTrigger, refreshData } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        setLoading(true);
        const [c, allOrders] = await Promise.all([
          customerService.getById(id),
          orderService.getAll()
        ]);
        if (!c) {
          showToast('Customer record not found', 'error');
          navigate('/customers');
          return;
        }
        setCustomer(c);
        const custOrders = allOrders.filter(o => o.customer_id === id);
        setOrders(custOrders);
      } catch (err) {
        showToast(err.message || 'Error loading customer profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerProfile();
  }, [id, refreshTrigger]);

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      await customerService.delete(customer.id);
      showToast(`Customer ${customer.full_name} deleted`, 'success');
      navigate('/customers');
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const valid = orders.filter(o => o.status !== 'Cancelled');
    const totalSpend = valid.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalBalance = valid.reduce((sum, o) => sum + Number(o.balance_due || 0), 0);
    return {
      orderCount: orders.length,
      totalSpend,
      totalBalance
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      o.order_number?.toLowerCase().includes(searchOrder.toLowerCase()) ||
      o.status?.toLowerCase().includes(searchOrder.toLowerCase())
    );
  }, [orders, searchOrder]);

  if (loading || !customer) {
    return <Spinner text="Loading customer profile..." />;
  }

  const waUrl = getWhatsAppUrl(customer.whatsapp || customer.phone, `Hello ${customer.full_name}, greeting from WEDORA Customized Chocolates.`);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/customers')}
        >
          Back to Directory
        </Button>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={Trash2}
            style={{ color: '#EF4444' }}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete Customer
          </Button>

          <Button
            variant="gold"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/orders/new')}
          >
            Create Order for this Client
          </Button>
        </div>
      </div>

      {/* Customer Hero Banner */}
      <div className="customer-profile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="customer-avatar-large">
            {customer.full_name ? customer.full_name[0] : 'C'}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold-300)', fontWeight: 600 }}>
              {customer.customer_code}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.2rem 0' }}>
              {customer.full_name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span>Registered: {formatDate(customer.created_at)}</span>
              {customer.notes && <span>• Note: {customer.notes}</span>}
            </div>
          </div>
        </div>

        <div className="profile-stats-bar">
          <div className="profile-stat-box">
            <span className="val">{stats.orderCount}</span>
            <span className="lbl">Lifetime Orders</span>
          </div>
          <div className="profile-stat-box">
            <span className="val">{formatCurrency(stats.totalSpend)}</span>
            <span className="lbl">Total Spending</span>
          </div>
          <div className="profile-stat-box">
            <span className="val" style={{ color: stats.totalBalance > 0 ? '#F87171' : '#34D399' }}>
              {formatCurrency(stats.totalBalance)}
            </span>
            <span className="lbl">Outstanding Balance</span>
          </div>
        </div>
      </div>

      {/* Contact & Address Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Phone size={20} color="var(--gold-500)" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</div>
            <a href={`tel:${customer.phone}`} style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
              {formatPhoneNumber(customer.phone)}
            </a>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <MessageSquare size={20} color="#059669" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WhatsApp Chat</div>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#059669' }}>
              Message Client Directly
            </a>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <MapPin size={20} color="var(--navy-800)" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Address</div>
            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
              {customer.address || 'Pickup at Wedora Studio'}
            </div>
          </div>
        </div>
      </div>

      {/* Client's Previous Orders */}
      <Card>
        <CardHeader
          title="Customer Order History"
          subtitle={`All previous custom chocolate commissions (${orders.length})`}
          action={
            <div className="input-icon-wrapper" style={{ width: 220 }}>
              <Search size={14} className="input-icon" />
              <input
                type="text"
                placeholder="Search orders..."
                className="form-input input-with-icon"
                style={{ padding: '0.4rem 0.6rem 0.4rem 2rem', fontSize: '0.8rem' }}
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
              />
            </div>
          }
        />
        {filteredOrders.length === 0 ? (
          <p style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No orders found for this customer.
          </p>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{ord.order_number}</td>
                    <td>{formatDate(ord.order_date)}</td>
                    <td>{formatDate(ord.delivery_date)}</td>
                    <td><OrderStatusBadge status={ord.status} /></td>
                    <td><PaymentStatusBadge status={ord.payment_status} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(ord.total_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: Number(ord.balance_due) > 0 ? '#DC2626' : '#059669' }}>
                      {formatCurrency(ord.balance_due)}
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-icon"
                        title="View Order Details"
                        onClick={() => navigate(`/orders/${ord.id}`)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Customer Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={
          customer
            ? `Are you sure you want to delete "${customer.full_name}" (${customer.customer_code})? This will permanently remove their customer profile.`
            : ''
        }
        confirmText={deleting ? 'Deleting...' : 'Delete Customer'}
        variant="danger"
      />
    </div>
  );
};
