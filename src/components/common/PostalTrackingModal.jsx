import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Copy, Check, ExternalLink, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import { SLP_TRACKING_URL } from '../../utils/formatters';

export const PostalTrackingModal = ({
  isOpen,
  onClose,
  barcode = '',
  orderNumber = ''
}) => {
  const [copied, setCopied] = useState(false);

  // Auto-copy barcode to clipboard on modal open
  useEffect(() => {
    if (isOpen && barcode) {
      try {
        navigator.clipboard.writeText(barcode.trim());
        setCopied(true);
        const timer = setTimeout(() => setCopied(false), 3000);
        return () => clearTimeout(timer);
      } catch (err) {
        console.warn('Auto-copy failed', err);
      }
    }
  }, [isOpen, barcode]);

  const handleCopy = () => {
    if (barcode) {
      navigator.clipboard.writeText(barcode.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenTrackingWindow = () => {
    handleCopy();
    // Open as a focused companion window (ensures PHP captcha session cookies are valid)
    const width = 860;
    const height = 750;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    window.open(
      'https://slpmail.slpost.gov.lk/track/index.php',
      'SLPMailTracking',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sri Lanka Post (SLP) Mail Tracking"
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="gold" onClick={handleOpenTrackingWindow}>
            <ExternalLink size={16} /> Open Tracking Portal
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Barcode Hero Box */}
        <div
          style={{
            backgroundColor: 'var(--navy-900)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} color="var(--gold-400)" />
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-300)', fontWeight: 700 }}>
                Postal Tracking Barcode
              </span>
            </div>
            {orderNumber && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Order: {orderNumber}
              </span>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--gold-300)' }}>
              {barcode || 'NO BARCODE'}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-gold btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem'
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* 3 Simple Steps */}
        <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} color="var(--gold-600)" />
            How to verify tracking with Sri Lanka Post:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--navy-900)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                1
              </span>
              <span>
                Your barcode is <strong>already copied</strong> to your clipboard.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--navy-900)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                2
              </span>
              <span>
                Click <strong>"Open Tracking Portal"</strong> below to launch the official SL Post window.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'var(--navy-900)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                3
              </span>
              <span>
                Click the <strong>Barcode</strong> box, press <kbd style={{ padding: '0.1rem 0.35rem', backgroundColor: '#FFF', border: '1px solid #CCC', borderRadius: 3 }}>Ctrl</kbd> + <kbd style={{ padding: '0.1rem 0.35rem', backgroundColor: '#FFF', border: '1px solid #CCC', borderRadius: 3 }}>V</kbd> to paste, type the 5-character verification code, and hit <strong>Search</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <Button
          variant="gold"
          size="lg"
          onClick={handleOpenTrackingWindow}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
        >
          <ExternalLink size={18} />
          <span>Launch SL Post Tracking Window</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </Modal>
  );
};
