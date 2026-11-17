import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // 'success', 'warning', 'danger', 'info', 'purple', 'gold', 'navy'
  dot = true,
  className = '',
  style = {}
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export const OrderStatusBadge = ({ status }) => {
  let variant = 'info';
  switch (status) {
    case 'New':
      variant = 'info';
      break;
    case 'Confirmed':
      variant = 'navy';
      break;
    case 'Preparing':
      variant = 'warning';
      break;
    case 'Ready':
      variant = 'purple';
      break;
    case 'Out for Delivery':
      variant = 'gold';
      break;
    case 'Delivered':
      variant = 'success';
      break;
    case 'Cancelled':
      variant = 'danger';
      break;
    default:
      variant = 'info';
  }

  return <Badge variant={variant}>{status}</Badge>;
};

export const PaymentStatusBadge = ({ status }) => {
  let variant = 'danger';
  if (status === 'Paid') {
    variant = 'success';
  } else if (status === 'Partially Paid') {
    variant = 'warning';
  }
  return <Badge variant={variant}>{status || 'Unpaid'}</Badge>;
};
