import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, customerService, paymentService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PostalTrackingModal } from '../components/common/PostalTrackingModal';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatPhoneNumber, copyTrackingAndOpenSlp } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Edit,
  Trash2,
  FileText,
  Clock,
  ArrowUpDown,
  Truck,
  CheckCircle,
  ListOrdered
} from 'lucide-react';

const ORDER_STATUS_OPTIONS = ['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'];

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order View Section: 'to_complete' (Active/Pending) vs 'completed' (Delivered/Finished)
  const [orderViewTab, setOrderViewTab] = useState('to_complete');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [orderTracking, setOrderTracking] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // In-App SLP Tracking Portal
  const [slpPortalOpen, setSlpPortalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('');

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Delete Confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { refreshTrigger, refreshData } = useData();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderService.getAll();
        setOrders(data);
      } catch (err) {
        showToast(err.message || 'Failed to load orders', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [refreshTrigger]);

  // Section Counts
  const toCompleteCount = useMemo(() => {
    return orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  }, [orders]);

  const completedCount = useMemo(() => {
    return orders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled').length;
  }, [orders]);

  // Contextual status dropdown options based on current section
  const availableStatuses = useMemo(() => {
    if (orderViewTab === 'to_complete') {
      return ['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery'];
    }
    return ['Delivered', 'Cancelled'];
  }, [orderViewTab]);

  // Reset status filter if switched between sections and filter no longer applies
  const handleTabChange = (tab) => {
    setOrderViewTab(tab);
    setStatusFilter('All');
  };

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      // 1. Partition by To Complete vs Completed
      if (orderViewTab === 'to_complete') {
        if (ord.status === 'Delivered' || ord.status === 'Cancelled') return false;
      } else {
        if (ord.status !== 'Delivered' && ord.status !== 'Cancelled') return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        ord.order_number?.toLowerCase().includes(searchLower) ||
        ord.customer?.full_name?.toLowerCase().includes(searchLower) ||
        ord.customer?.phone?.includes(searchTerm);

      const matchStatus = statusFilter === 'All' || ord.status === statusFilter;
      const matchPayment = paymentFilter === 'All' || ord.payment_status === paymentFilter;

      return matchSearch && matchStatus && matchPayment;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || b.order_date) - new Date(a.created_at || a.order_date);
      if (sortBy === 'delivery_date') return new Date(a.delivery_date) - new Date(b.delivery_date);
      if (sortBy === 'amount_high') return Number(b.total_amount) - Number(a.total_amount);
      if (sortBy === 'balance_high') return Number(b.balance_due) - Number(a.balance_due);
      return 0;
    });
  }, [orders, orderViewTab, searchTerm, statusFilter, paymentFilter, sortBy]);

  // Handle Status Update
  const handleOpenStatusModal = (ord, e) => {
    e.stopPropagation();
    setSelectedOrder(ord);
    setNewStatus(ord.status);
    setStatusNotes('');
    setOrderTracking(ord.tracking_number || '');
    setStatusModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await orderService.updateStatus(selectedOrder.id, newStatus, statusNotes, user);
      if (orderTracking.trim() !== (selectedOrder.tracking_number || '')) {
        await orderService.updateTracking(selectedOrder.id, orderTracking.trim(), 'SL Post', user);
      }
      showToast(`Order status updated to ${newStatus}`, 'success');
      setStatusModalOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Direct Inline Status Update from Table Dropdown
  const handleInlineStatusChange = async (orderId, orderNumber, updatedStatus, e) => {
    e.stopPropagation();
    try {
      await orderService.updateStatus(orderId, updatedStatus, `Status changed directly from orders table`, user);
      showToast(`Order ${orderNumber} status changed to ${updatedStatus}`, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to change order status', 'error');
    }
  };

  // Handle Quick Payment
  const handleOpenPaymentModal = (ord, e) => {
    e.stopPropagation();
    setSelectedOrder(ord);
    setPaymentAmount(ord.balance_due > 0 ? String(ord.balance_due) : '');
    setPaymentMethod('Cash');
    setPaymentRef('');
    setPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }
    if (amount > Number(selectedOrder.balance_due)) {
      if (!window.confirm(`The amount (Rs. ${amount}) exceeds the remaining balance of Rs. ${selectedOrder.balance_due}. Do you wish to continue?`)) {
        return;
      }
    }

    setRecordingPayment(true);
    try {
      await paymentService.create({
        order_id: selectedOrder.id,
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentRef,
        notes: 'Payment recorded from orders list'
      }, user);
      showToast(`Payment of ${formatCurrency(amount)} recorded`, 'success');
      setPaymentModalOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Handle Delete
  const handleOpenDelete = (ord, e) => {
    e.stopPropagation();
    setOrderToDelete(ord);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    try {
      await orderService.delete(orderToDelete.id);
      showToast(`Order ${orderToDelete.order_number} deleted`, 'success');
      setDeleteConfirmOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to delete order', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* High-Level Order Queue Partition: To Complete vs Completed */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="filter-tabs" style={{ gap: '0.5rem' }}>
          <button
            className={`filter-tab ${orderViewTab === 'to_complete' ? 'active' : ''}`}
            onClick={() => handleTabChange('to_complete')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ListOrdered size={16} />
            <span>To Complete Orders</span>
            <span
              style={{
                marginLeft: '0.35rem',
                backgroundColor: orderViewTab === 'to_complete' ? 'var(--gold-500)' : 'var(--bg-card)',
                color: orderViewTab === 'to_complete' ? 'var(--navy-950)' : 'var(--text-secondary)',
                padding: '0.1rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {toCompleteCount}
            </span>
          </button>

          <button
            className={`filter-tab ${orderViewTab === 'completed' ? 'active' : ''}`}
            onClick={() => handleTabChange('completed')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <CheckCircle size={16} />
            <span>Completed Orders</span>
            <span
              style={{
                marginLeft: '0.35rem',
                backgroundColor: orderViewTab === 'completed' ? 'var(--gold-500)' : 'var(--bg-card)',
                color: orderViewTab === 'completed' ? 'var(--navy-950)' : 'var(--text-secondary)',
                padding: '0.1rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {completedCount}
            </span>
          </button>
        </div>

        <Button
          variant="gold"
          icon={Plus}
          onClick={() => navigate('/orders/new')}
        >
          Create Order
        </Button>
      </div>

      {/* Action Header & Search */}
      <div className="page-action-bar">
        <div className="search-filter-row">
          <div className="input-icon-wrapper" style={{ flex: '1 1 240px' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder={`Search in ${orderViewTab === 'to_complete' ? 'active' : 'completed'} orders...`}
              className="form-input input-with-icon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All {orderViewTab === 'to_complete' ? 'Active' : 'Completed'} Statuses</option>
            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="All">All Payments</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="delivery_date">Sort: Delivery Date</option>
            <option value="amount_high">Sort: Highest Total</option>
            <option value="balance_high">Sort: Highest Balance</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <Spinner text="Loading orders ledger..." />
      ) : filteredOrders.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Filter size={24} />
          </div>
          <h4 className="empty-state-title">
            {orderViewTab === 'to_complete' ? 'No orders to complete' : 'No completed orders'}
          </h4>
          <p style={{ maxWidth: 420, marginBottom: '1.25rem' }}>
            {searchTerm || statusFilter !== 'All' || paymentFilter !== 'All'
              ? 'No orders matched your current filters. Try resetting search or filter criteria.'
              : orderViewTab === 'to_complete'
              ? 'All orders are fulfilled! There are no pending or in-progress orders at the moment.'
              : 'There are no completed or delivered orders yet.'}
          </p>
          {orderViewTab === 'to_complete' && (
            <Button variant="gold" icon={Plus} onClick={() => navigate('/orders/new')}>
              Create New Order
            </Button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Order Status</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                <th style={{ textAlign: 'right' }}>Balance Due</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => (
                <tr
                  key={ord.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/orders/${ord.id}`)}
                >
                  <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                    <div>{ord.order_number}</div>
                    {ord.tracking_number && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBarcode(ord.tracking_number);
                          setSelectedOrderNumber(ord.order_number);
                          setSlpPortalOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.72rem',
                          color: 'var(--gold-600)',
                          backgroundColor: 'var(--gold-100)',
                          padding: '0.12rem 0.4rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--gold-200)',
                          marginTop: '0.25rem',
                          fontFamily: 'monospace',
                          fontWeight: 700
                        }}
                        title="Click to copy & track on SLP"
                      >
                        <Truck size={11} />
                        <span>{ord.tracking_number}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ord.customer?.full_name || 'Walk-in Customer'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatPhoneNumber(ord.customer?.phone)}
                    </div>
                  </td>
                  <td>{formatDate(ord.order_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{formatDate(ord.delivery_date)}</div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="form-select"
                      value={ord.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleInlineStatusChange(ord.id, ord.order_number, e.target.value, e)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-full)',
                        width: 'auto',
                        minWidth: '135px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        ...(ord.status === 'New'
                          ? { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }
                          : ord.status === 'Confirmed'
                          ? { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: '#CBD5E1' }
                          : ord.status === 'Preparing'
                          ? { backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' }
                          : ord.status === 'Ready'
                          ? { backgroundColor: '#F3E8FF', color: '#6B21A8', borderColor: '#E9D5FF' }
                          : ord.status === 'Out for Delivery'
                          ? { backgroundColor: '#FEF9C3', color: '#854D0E', borderColor: '#FEF08A' }
                          : ord.status === 'Delivered'
                          ? { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' }
                          : { backgroundColor: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' })
                      }}
                    >
                      {ORDER_STATUS_OPTIONS.map((statusOpt) => (
                        <option
                          key={statusOpt}
                          value={statusOpt}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: 'var(--navy-900)',
                            fontWeight: statusOpt === ord.status ? 700 : 500
                          }}
                        >
                          {statusOpt === ord.status ? `● ${statusOpt}` : `  ${statusOpt}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <PaymentStatusBadge status={ord.payment_status} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(ord.total_amount)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: Number(ord.balance_due) > 0 ? '#DC2626' : '#059669' }}>
                    {formatCurrency(ord.balance_due)}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        title="View Order Details"
                        onClick={() => navigate(`/orders/${ord.id}`)}
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        className="btn btn-secondary btn-icon"
                        title="Update Production Status"
                        onClick={(e) => handleOpenStatusModal(ord, e)}
                      >
                        <Clock size={15} color="#D97706" />
                      </button>

                      {Number(ord.balance_due) > 0 && (
                        <button
                          className="btn btn-secondary btn-icon"
                          title="Record Payment"
                          onClick={(e) => handleOpenPaymentModal(ord, e)}
                        >
                          <CreditCard size={15} color="#059669" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          className="btn btn-danger btn-icon"
                          title="Delete Order"
                          onClick={(e) => handleOpenDelete(ord, e)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: ${selectedOrder?.order_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleUpdateStatusSubmit} loading={updatingStatus}>
              Save Status
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateStatusSubmit}>
          <div className="form-group">
            <label className="form-label">Order Stage</label>
            <select
              className="form-select"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {ORDER_STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status Change Note / Audit Reason</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Dispatched with courier Nuwan, or Customer collected at studio"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Postal Tracking Barcode (SL Post)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. CP123456789LK"
              value={orderTracking}
              onChange={(e) => setOrderTracking(e.target.value)}
              style={{ fontFamily: 'monospace', fontWeight: 700 }}
            />
            <span className="form-helper">Optional: Add barcode for parcel tracking</span>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${selectedOrder?.order_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleRecordPaymentSubmit} loading={recordingPayment}>
              Record Payment
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordPaymentSubmit}>
          <div style={{ backgroundColor: 'var(--navy-50)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Order Total:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(selectedOrder?.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Already Paid:</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(selectedOrder?.total_paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 700, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem', marginTop: '0.35rem' }}>
              <span>Remaining Balance:</span>
              <span style={{ color: '#DC2626' }}>{formatCurrency(selectedOrder?.balance_due)}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Amount (LKR) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Reference / Bank Slip #</label>
            <input
              type="text"
              className="form-input"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. HNB-FT-12345 or Cash receipt #"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Order"
        message={`Are you sure you want to permanently delete order ${orderToDelete?.order_number}? All associated order line items, payment records, and delivery history will be removed.`}
        confirmText="Delete Order"
        loading={deleting}
      />

      {/* Embedded In-App Sri Lanka Post Tracking Portal */}
      <PostalTrackingModal
        isOpen={slpPortalOpen}
        onClose={() => setSlpPortalOpen(false)}
        barcode={selectedBarcode}
        orderNumber={selectedOrderNumber}
      />
    </div>
  );
};
