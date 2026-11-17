/**
 * Mathematical calculations and financial logic for Wedora
 */

export const calculateItemSubtotal = (quantity, unitPrice) => {
  const qty = parseInt(quantity, 10) || 0;
  const price = parseFloat(unitPrice) || 0;
  return Number((qty * price).toFixed(2));
};

export const calculateOrderTotals = (items = [], additionalCharges = 0, discount = 0) => {
  const subtotal = items.reduce((acc, item) => {
    return acc + (Number(item.subtotal) || calculateItemSubtotal(item.quantity, item.unit_price));
  }, 0);

  const charges = Number(additionalCharges) || 0;
  const disc = Number(discount) || 0;

  const totalAmount = Math.max(0, Number((subtotal + charges - disc).toFixed(2)));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    additional_charges: charges,
    discount: disc,
    total_amount: totalAmount
  };
};

export const derivePaymentStatus = (totalAmount, totalPaid) => {
  const total = Number(totalAmount) || 0;
  const paid = Number(totalPaid) || 0;

  if (paid >= total && total > 0) {
    return 'Paid';
  }
  if (paid > 0) {
    return 'Partially Paid';
  }
  return 'Unpaid';
};

export const calculateRemainingBalance = (totalAmount, totalPaid) => {
  const total = Number(totalAmount) || 0;
  const paid = Number(totalPaid) || 0;
  return Math.max(0, Number((total - paid).toFixed(2)));
};
