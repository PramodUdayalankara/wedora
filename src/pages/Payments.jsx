import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService, orderService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import {
  CreditCard,
  Plus,
  Search,
  ArrowUpRight,
  Landmark,
  Banknote,
  Receipt,
  Eye
} from 'lucide-react';

export const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');

  // Record Payment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);

  const { refreshTrigger, refreshData } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pList, oList] = await Promise.all([
          paymentService.getAll(),
          orderService.getAll()
        ]);
        setPayments(pList);
        setOrders(oList);
      } catch (err) {
        showToast(err.message || 'Failed to load payment ledger', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // Orders with remaining balances for the dropdown
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'Cancelled' && Number(o.balance_due) > 0);
  }, [orders]);

  // Selected Order for Modal
  const currentModalOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalCash = 0;
    let totalBank = 0;
    let totalAll = 0;

    payments.forEach(p => {
      const amt = Number(p.amount || 0);
      totalAll += amt;
      if (p.payment_method === 'Cash') totalCash += amt;
      if (p.payment_method === 'Bank Transfer') totalBank += amt;
    });

    const outstandingTotal = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + Number(o.balance_due || 0), 0);

    return { totalCash, totalBank, totalAll, outstandingTotal, count: payments.length };
  }, [payments, orders]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        p.payment_number?.toLowerCase().includes(term) ||
        p.order?.order_number?.toLowerCase().includes(term) ||
        p.order?.customer?.full_name?.toLowerCase().includes(term) ||
        p.payment_reference?.toLowerCase().includes(term);

      const matchMethod = methodFilter === 'All' || p.payment_method === methodFilter;

      return matchSearch && matchMethod;
    });
  }, [payments, searchTerm, methodFilter]);

  const handleOpenModal = () => {
    if (pendingOrders.length > 0) {
      setSelectedOrderId(pendingOrders[0].id);
      setAmount(String(pendingOrders[0].balance_due));
    } else {
      setSelectedOrderId('');
      setAmount('');
    }
    setMethod('Cash');
    setReference('');
    setNotes('');
    setModalOpen(true);
  };

  const handleOrderSelectChange = (ordId) => {
    setSelectedOrderId(ordId);
    const ord = orders.find(o => o.id === ordId);
    if (ord && Number(ord.balance_due) > 0) {
      setAmount(String(ord.balance_due));
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      showToast('Please select an order to apply payment to', 'warning');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    if (currentModalOrder && amt > Number(currentModalOrder.balance_due)) {
      if (!window.confirm(`Amount (Rs. ${amt}) exceeds remaining balance of Rs. ${currentModalOrder.balance_due}. Confirm anyway?`)) {
        return;
      }
    }

    setRecording(true);
    try {
      await paymentService.create({
        order_id: selectedOrderId,
        amount: amt,
        payment_method: method,
        payment_reference: reference,
        notes
      }, user);

      showToast(`Payment of ${formatCurrency(amt)} recorded successfully`, 'success');
      setModalOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '1.75rem' }}>
        <StatCard
          label="Total Collected"
          value={formatCurrency(summary.totalAll)}
          subtext={`${summary.count} transactions recorded`}
          icon={CreditCard}
          accent="gold"
          iconBg="var(--gold-100)"
          iconColor="var(--gold-600)"
        />
        <StatCard
          label="Bank Transfers"
          value={formatCurrency(summary.totalBank)}
          subtext="Online / Direct bank deposits"
          icon={Landmark}
          accent="navy"
          iconBg="var(--navy-100)"
          iconColor="var(--navy-900)"
        />
        <StatCard
          label="Cash Collected"
          value={formatCurrency(summary.totalCash)}
          subtext="Studio counter & on-delivery cash"
          icon={Banknote}
          accent="emerald"
          iconBg="var(--status-success-bg)"
          iconColor="#059669"
        />
        <StatCard
          label="Total Receivables"
          value={formatCurrency(summary.outstandingTotal)}
          subtext="Pending payment on orders"
          icon={Receipt}
          accent="rose"
          iconBg="var(--status-danger-bg)"
          iconColor="#EF4444"
        />
      </div>

      {/* Action Bar */}
      <div className="page-action-bar">
        <div className="search-filter-row">
          <div className="input-icon-wrapper" style={{ flex: '1 1 240px' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search by Payment #, Order #, Customer, or Ref..."
              className="form-input input-with-icon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <Button
          variant="gold"
          icon={Plus}
          onClick={handleOpenModal}
        >
          Record Payment
        </Button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <Spinner text="Loading payment ledger..." />
      ) : filteredPayments.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <CreditCard size={24} />
          </div>
          <h4 className="empty-state-title">No payment records found</h4>
          <p style={{ maxWidth: 400, marginBottom: '1.25rem' }}>
            {searchTerm || methodFilter !== 'All'
              ? 'No payments matched your search filters.'
              : 'Record customer advance deposits and balance settlements here.'}
          </p>
          <Button variant="gold" icon={Plus} onClick={handleOpenModal}>
            Record Payment
          </Button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Payment Date</th>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Reference #</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--gold-600)' }}>
                    {p.payment_number}
                  </td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>
                    {p.order ? (
                      <span
                        style={{ fontWeight: 600, color: 'var(--navy-900)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => navigate(`/orders/${p.order_id}`)}
                      >
                        {p.order.order_number}
                      </span>
                    ) : (
                      p.order_id
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.order?.customer?.full_name || 'Walk-in'}</div>
                  </td>
                  <td>
                    <span className="badge badge-navy">{p.payment_method}</span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {p.payment_reference || '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.order_id && (
                      <button
                        className="btn btn-secondary btn-icon"
                        title="View Related Order"
                        onClick={() => navigate(`/orders/${p.order_id}`)}
                      >
                        <Eye size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Customer Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleRecordPayment} loading={recording}>
              Confirm & Save Payment
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment}>
          <div className="form-group">
            <label className="form-label">Select Target Order *</label>
            <select
              className="form-select"
              value={selectedOrderId}
              onChange={(e) => handleOrderSelectChange(e.target.value)}
              required
            >
              <option value="">Choose an order with outstanding balance...</option>
              {pendingOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.customer?.full_name || 'Customer'} (Due: Rs. {o.balance_due})
                </option>
              ))}
            </select>
          </div>

          {currentModalOrder && (
            <div style={{ backgroundColor: 'var(--navy-50)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Order Total:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(currentModalOrder.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already Paid:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>{formatCurrency(currentModalOrder.total_paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem', marginTop: '0.35rem' }}>
                <span>Remaining Balance Due:</span>
                <span style={{ color: '#DC2626' }}>{formatCurrency(currentModalOrder.balance_due)}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Payment Amount (LKR) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Cash">Cash (Studio Counter / Delivery)</option>
              <option value="Bank Transfer">Bank Transfer (HNB / Commercial / BOC)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reference / Bank Deposit Slip Number</label>
            <input
              type="text"
              className="form-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. HNB-FT-984210"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Balance settlement upon wedding delivery"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
