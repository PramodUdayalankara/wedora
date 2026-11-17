import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryService, orderService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OrderStatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PostalTrackingModal } from '../components/common/PostalTrackingModal';
import { Spinner } from '../components/common/Spinner';
import { formatDate, getDeliveryRelativeLabel, getDeliveryUrgency } from '../utils/dateUtils';
import { formatPhoneNumber, getWhatsAppUrl, copyTrackingAndOpenSlp } from '../utils/formatters';
import {
  Truck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  MapPin,
  Search,
  Filter,
  ExternalLink,
  Copy
} from 'lucide-react';

export const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'today', 'upcoming', 'overdue', 'delivered'
  const [searchTerm, setSearchTerm] = useState('');

  // Dispatch / Update Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [newStatus, setNewStatus] = useState('Out for Delivery');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // SLP In-App Tracking Portal
  const [slpPortalOpen, setSlpPortalOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('');

  const { refreshTrigger, refreshData } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const data = await deliveryService.getAll();
        setDeliveries(data || []);
      } catch (err) {
        showToast(err.message || 'Failed to load deliveries', 'error');
        setDeliveries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, [refreshTrigger]);

  // Tab counts
  const counts = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    let delivered = 0;

    (deliveries || []).forEach(d => {
      if (d.order_status === 'Delivered') {
        delivered += 1;
      } else if (d.urgency === 'overdue') {
        overdue += 1;
      } else if (d.urgency === 'today') {
        today += 1;
      } else if (d.urgency === 'upcoming') {
        upcoming += 1;
      }
    });

    return { all: (deliveries || []).length, today, upcoming, overdue, delivered };
  }, [deliveries]);

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return (deliveries || []).filter(d => {
      const term = (searchTerm || '').toLowerCase();
      const matchSearch =
        d.order_number?.toLowerCase().includes(term) ||
        d.customer_name?.toLowerCase().includes(term) ||
        d.phone?.includes(searchTerm) ||
        d.tracking_number?.toLowerCase().includes(term) ||
        d.delivery_address?.toLowerCase().includes(term);

      let matchTab = true;
      if (activeTab === 'today') matchTab = d.urgency === 'today' && d.order_status !== 'Delivered';
      else if (activeTab === 'upcoming') matchTab = d.urgency === 'upcoming' && d.order_status !== 'Delivered';
      else if (activeTab === 'overdue') matchTab = d.urgency === 'overdue' && d.order_status !== 'Delivered';
      else if (activeTab === 'delivered') matchTab = d.order_status === 'Delivered';

      return matchSearch && matchTab;
    }).sort((a, b) => {
      const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
      const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [deliveries, searchTerm, activeTab]);

  const handleOpenUpdateModal = (item) => {
    setSelectedDelivery(item);
    setNewStatus(item.order_status === 'Ready' ? 'Out for Delivery' : item.order_status);
    setDeliveryPerson(item.courier_name || 'SL Post');
    setTrackingNumber(item.tracking_number || '');
    setDeliveryNotes('');
    setModalOpen(true);
  };

  const handleSaveDeliveryUpdate = async (e) => {
    e.preventDefault();
    if (!selectedDelivery) return;
    setSaving(true);
    try {
      await deliveryService.updateDelivery(
        selectedDelivery.order_id,
        newStatus,
        deliveryPerson,
        deliveryNotes,
        trackingNumber.trim(),
        user
      );
      showToast(`Delivery status updated to ${newStatus}`, 'success');
      setModalOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to update delivery progress', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSlpPortal = (barcode, orderNum) => {
    setSelectedBarcode(barcode);
    setSelectedOrderNumber(orderNum);
    setSlpPortalOpen(true);
  };

  return (
    <div className="animate-fade-in">
      {/* Tab Filter Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Dispatches ({counts.all})
          </button>
          <button
            className={`filter-tab ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
            style={counts.today > 0 ? { borderColor: 'var(--gold-400)', color: 'var(--gold-600)' } : {}}
          >
            Today ({counts.today})
          </button>
          <button
            className={`filter-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({counts.upcoming})
          </button>
          <button
            className={`filter-tab ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
            style={counts.overdue > 0 ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' } : {}}
          >
            ⚠ Overdue ({counts.overdue})
          </button>
          <button
            className={`filter-tab ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered ({counts.delivered})
          </button>
        </div>

        <div className="input-icon-wrapper" style={{ width: 260 }}>
          <Search size={16} className="input-icon" />
          <input
            type="text"
            placeholder="Search deliveries..."
            className="form-input input-with-icon"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading delivery schedule..." />
      ) : filteredDeliveries.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Truck size={24} />
          </div>
          <h4 className="empty-state-title">No deliveries found</h4>
          <p style={{ maxWidth: 400 }}>
            {activeTab === 'overdue'
              ? 'Great news! There are no overdue chocolate orders.'
              : 'No orders match this delivery queue.'}
          </p>
        </div>
      ) : (
        <div className="delivery-grid">
          {filteredDeliveries.map((item) => {
            const isOverdue = item.urgency === 'overdue';
            const isToday = item.urgency === 'today';
            let msg = `Hello ${item.customer_name}, regarding your customized chocolate order (${item.order_number}):`;
            if (item.tracking_number) {
              msg += ` Your parcel has been mailed via Sri Lanka Post! Tracking Barcode: ${item.tracking_number}. Track here: http://slpmail.slpost.gov.lk/track/index.php`;
            } else {
              msg += ` Scheduled delivery date: ${formatDate(item.delivery_date)}. Delivery address: ${item.delivery_address}. Thank you, WEDORA Chocolates.`;
            }
            const waUrl = getWhatsAppUrl(item.whatsapp || item.phone, msg);

            return (
              <div
                key={item.order_id}
                className={`delivery-card ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => navigate(`/orders/${item.order_id}`)}
                    >
                      {item.order_number}
                    </span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                      {item.customer_name}
                    </div>
                  </div>
                  <OrderStatusBadge status={item.order_status} />
                </div>

                {/* Delivery Date & Urgency Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Calendar size={15} color={isOverdue ? '#DC2626' : 'var(--gold-500)'} />
                  <span style={{ fontWeight: 600, color: isOverdue ? '#DC2626' : 'var(--text-main)' }}>
                    {formatDate(item.delivery_date)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: isOverdue ? '#DC2626' : 'var(--text-muted)' }}>
                    ({getDeliveryRelativeLabel(item.delivery_date)})
                  </span>
                </div>

                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={15} style={{ flexShrink: 0, marginTop: 2 }} color="var(--navy-800)" />
                  <span style={{ lineHeight: 1.4 }}>{item.delivery_address}</span>
                </div>

                {/* Postal Tracking Barcode Badge */}
                {item.tracking_number && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--navy-50)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Truck size={14} color="var(--gold-600)" />
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--navy-900)' }}>
                        {item.tracking_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSlpPortal(item.tracking_number, item.order_number)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--gold-600)' }}
                      title="Track on SLP Mail Tracking Site"
                    >
                      <ExternalLink size={12} />
                      <span>Track SLP</span>
                    </button>
                  </div>
                )}

                {/* Notes if available */}
                {item.notes && (
                  <div style={{ backgroundColor: 'var(--bg-hover)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.notes}
                  </div>
                )}

                {/* Contact and Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="btn btn-secondary btn-icon"
                        title="Call Customer"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                    {item.phone && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-icon"
                        title="WhatsApp Dispatch Alert"
                        style={{ color: '#059669' }}
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}
                  </div>

                  <Button
                    variant={item.order_status === 'Delivered' ? 'secondary' : 'gold'}
                    size="sm"
                    onClick={() => handleOpenUpdateModal(item)}
                  >
                    {item.order_status === 'Delivered' ? 'Update Notes' : 'Dispatch / Update'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch / Delivery Progress Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Update Delivery: ${selectedDelivery?.order_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSaveDeliveryUpdate} loading={saving}>
              Confirm Progress
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveDeliveryUpdate}>
          <div className="form-group">
            <label className="form-label">Delivery Progress State</label>
            <select
              className="form-select"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="Preparing">Preparing in Kitchen Studio</option>
              <option value="Ready">Ready for Pickup / Dispatch</option>
              <option value="Out for Delivery">Out for Delivery (Courier In Transit)</option>
              <option value="Delivered">Delivered Successfully to Customer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Courier / Delivery Service</label>
            <input
              type="text"
              className="form-input"
              value={deliveryPerson}
              onChange={(e) => setDeliveryPerson(e.target.value)}
              placeholder="e.g. Sri Lanka Post (SLP) or Wedora Express"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Postal Tracking Barcode (SL Post / Courier)</label>
            <input
              type="text"
              className="form-input"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. CP123456789LK"
              style={{ fontFamily: 'monospace', fontWeight: 700 }}
            />
            <span className="form-helper">Enter or scan barcode when mailing via Sri Lanka Post</span>
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Notes / Handover Details</label>
            <textarea
              className="form-textarea"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Handed over to recipient with temperature-controlled thermal bag"
            />
          </div>
        </form>
      </Modal>

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
