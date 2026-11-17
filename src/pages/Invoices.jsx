import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { downloadInvoicePDF, printInvoicePDF, buildWhatsAppInvoiceMessage, shareInvoicePDFToWhatsApp } from '../services/invoiceService';
import { PaymentStatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatPhoneNumber, getWhatsAppUrl } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import {
  FileText,
  Printer,
  Download,
  Search,
  Eye,
  Filter,
  Send,
  MessageSquare
} from 'lucide-react';

export const Invoices = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const { refreshTrigger, settings } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderService.getAll();
        setOrders(data);
      } catch (err) {
        showToast('Failed to load invoices', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [refreshTrigger]);

  const filteredInvoices = useMemo(() => {
    return orders.filter(o => {
      const invNum = `INV-${o.order_number?.replace('WED-', '') || o.id}`.toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchSearch =
        invNum.includes(term) ||
        o.order_number?.toLowerCase().includes(term) ||
        o.customer?.full_name?.toLowerCase().includes(term);

      const matchPayment = paymentFilter === 'All' || o.payment_status === paymentFilter;

      return matchSearch && matchPayment;
    });
  }, [orders, searchTerm, paymentFilter]);

  const handleDownload = async (order, e) => {
    e.stopPropagation();
    try {
      const fullOrder = await orderService.getById(order.id);
      downloadInvoicePDF(fullOrder, fullOrder.customer, fullOrder.items, fullOrder.payments, settings);
      showToast(`Downloaded invoice for ${order.order_number}`, 'success');
    } catch (err) {
      showToast('Error generating invoice PDF', 'error');
    }
  };

  const handlePrint = async (order, e) => {
    e.stopPropagation();
    try {
      const fullOrder = await orderService.getById(order.id);
      printInvoicePDF(fullOrder, fullOrder.customer, fullOrder.items, fullOrder.payments, settings);
    } catch (err) {
      showToast('Error opening print preview', 'error');
    }
  };

  const handleWhatsAppInvoice = async (order, e) => {
    e.stopPropagation();
    try {
      const fullOrder = await orderService.getById(order.id);
      const isAdvance = Number(fullOrder.balance_due) > 0 && Number(fullOrder.total_paid) === 0;
      const defaultPct = settings?.default_advance_percent || 50;
      const advanceAmt = Math.round((Number(fullOrder.total_amount) * defaultPct) / 100);

      const res = await shareInvoicePDFToWhatsApp(fullOrder, fullOrder.customer, fullOrder.items, fullOrder.payments, settings, {
        isAdvanceInvoice: isAdvance,
        advanceAmount: advanceAmt
      });

      if (res?.sharedDirectly) {
        showToast('Invoice PDF shared to WhatsApp!', 'success');
      } else if (!res?.cancelled) {
        showToast(`Invoice PDF downloaded (${res?.fileName}). Attach it to the opened WhatsApp chat!`, 'success');
      }
    } catch (err) {
      showToast('Error sharing invoice PDF to WhatsApp', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-action-bar">
        <div className="search-filter-row">
          <div className="input-icon-wrapper" style={{ flex: '1 1 240px' }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search by Invoice #, Order #, or Customer name..."
              className="form-input input-with-icon"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading invoice registry..." />
      ) : filteredInvoices.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <FileText size={24} />
          </div>
          <h4 className="empty-state-title">No invoices found</h4>
          <p style={{ maxWidth: 400 }}>
            Invoices are automatically available for every chocolate order placed in the system.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order Ref</th>
                <th>Customer / Billed To</th>
                <th>Invoice Date</th>
                <th>Delivery Date</th>
                <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((ord) => {
                const invNumber = `INV-${ord.order_number?.replace('WED-', '') || ord.id}`;
                return (
                  <tr
                    key={ord.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                      {invNumber}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--gold-600)' }}>
                      {ord.order_number}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.customer?.full_name || 'Walk-in'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatPhoneNumber(ord.customer?.phone)}
                      </div>
                    </td>
                    <td>{formatDate(ord.order_date)}</td>
                    <td>{formatDate(ord.delivery_date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(ord.total_amount)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: Number(ord.balance_due) > 0 ? '#DC2626' : '#059669' }}>
                      {formatCurrency(ord.balance_due)}
                    </td>
                    <td>
                      <PaymentStatusBadge status={ord.payment_status} />
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          title="Download PDF Invoice"
                          onClick={(e) => handleDownload(ord, e)}
                        >
                          <Download size={15} color="var(--navy-900)" />
                        </button>

                        <button
                          className="btn btn-secondary btn-icon"
                          title="Print Invoice"
                          onClick={(e) => handlePrint(ord, e)}
                        >
                          <Printer size={15} color="var(--gold-600)" />
                        </button>

                        <button
                          className="btn btn-secondary btn-icon"
                          title="Send Invoice / Advance via WhatsApp"
                          style={{ color: '#059669' }}
                          onClick={(e) => handleWhatsAppInvoice(ord, e)}
                        >
                          <Send size={15} />
                        </button>

                        <button
                          className="btn btn-secondary btn-icon"
                          title="View Order"
                          onClick={() => navigate(`/orders/${ord.id}`)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
