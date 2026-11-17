import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 28, text = 'Loading data...', color = 'var(--gold-500)' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '0.75rem',
        color: 'var(--text-muted)'
      }}
    >
      <Loader2 size={size} color={color} className="animate-spin" />
      {text && <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{text}</span>}
    </div>
  );
};
