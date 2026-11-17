import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  initialEmployees,
  initialProducts,
  initialCustomers,
  initialOrders,
  initialOrderItems,
  initialPayments,
  initialStatusHistory,
  initialDeliveryHistory,
  initialBusinessSettings,
  initialExpenses
} from './demoData';
import { calculateOrderTotals, calculateRemainingBalance, derivePaymentStatus } from '../utils/calculations';
import { getDeliveryUrgency } from '../utils/dateUtils';
import { isWithinInterval, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';

const STORAGE_KEY_PREFIX = 'wedora_db_';

// Helper to get or set localStorage collections
const getLocalCollection = (table, defaultData) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${table}`);
    if (!raw) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${table}`, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading collection ${table}`, err);
    return defaultData;
  }
};

const setLocalCollection = (table, data) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${table}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving collection ${table}`, err);
  }
};

export const initLocalDatabase = () => {
  getLocalCollection('employees', initialEmployees);
  const currentProds = getLocalCollection('products', initialProducts);
  ['A', 'A1', 'C1', 'D1'].reverse().forEach(code => {
    if (!currentProds.some(p => p.product_code === code)) {
      const match = initialProducts.find(p => p.product_code === code);
      if (match) currentProds.unshift(match);
    }
  });
  setLocalCollection('products', currentProds);

  getLocalCollection('customers', initialCustomers);
  getLocalCollection('orders', initialOrders);
  getLocalCollection('order_items', initialOrderItems);
  getLocalCollection('payments', initialPayments);
  getLocalCollection('status_history', initialStatusHistory);
  getLocalCollection('delivery_history', initialDeliveryHistory);
  getLocalCollection('settings', initialBusinessSettings);
  getLocalCollection('expenses', initialExpenses);
};

if (!isSupabaseConfigured) {
  initLocalDatabase();
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export const customerService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return getLocalCollection('customers', initialCustomers);
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
    const customers = getLocalCollection('customers', initialCustomers);
    return customers.find(c => c.id === id) || null;
  },

  async checkPhoneExists(phone, excludeId = null) {
    const customers = await this.getAll();
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return customers.some(c => {
      if (excludeId && c.id === excludeId) return false;
      const existingClean = (c.phone || '').replace(/[^\d]/g, '');
      return existingClean && (existingClean === cleanPhone || existingClean.endsWith(cleanPhone) || cleanPhone.endsWith(existingClean));
    });
  },

  async create(customerData, userId = null) {
    if (isSupabaseConfigured) {
      const code = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        ...customerData,
        customer_code: code,
        created_by: userId
      };
      const { data, error } = await supabase.from('customers').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }

    const customers = getLocalCollection('customers', initialCustomers);
    const newCustomer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      customer_code: `CUST-${1000 + customers.length + 1}`,
      created_at: new Date().toISOString()
    };
    customers.unshift(newCustomer);
    setLocalCollection('customers', customers);
    return newCustomer;
  },

  async update(id, updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const customers = getLocalCollection('customers', initialCustomers);
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    customers[idx] = { ...customers[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalCollection('customers', customers);
    return customers[idx];
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const customers = getLocalCollection('customers', initialCustomers);
    const filtered = customers.filter(c => c.id !== id);
    setLocalCollection('customers', filtered);
    return true;
  }
};

// ============================================================================
// PRODUCTS
// ============================================================================

export const productService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    }
    return getLocalCollection('products', initialProducts);
  },

  async getActive() {
    const all = await this.getAll();
    return all.filter(p => p.is_active);
  },

  async create(productData) {
    if (isSupabaseConfigured) {
      const code = productData.product_code || `PRD-${Math.floor(100 + Math.random() * 900)}`;
      const { data, error } = await supabase.from('products').insert([{ ...productData, product_code: code }]).select().single();
      if (error) throw error;
      return data;
    }

    const products = getLocalCollection('products', initialProducts);
    const newProduct = {
      ...productData,
      id: `prd-${Date.now()}`,
      product_code: productData.product_code || `PRD-${100 + products.length + 1}`,
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      created_at: new Date().toISOString()
    };
    products.push(newProduct);
    setLocalCollection('products', products);
    return newProduct;
  },

  async update(id, updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const products = getLocalCollection('products', initialProducts);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    products[idx] = { ...products[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalCollection('products', products);
    return products[idx];
  },

  async toggleStatus(id) {
    const products = await this.getAll();
    const target = products.find(p => p.id === id);
    if (!target) throw new Error('Product not found');
    return this.update(id, { is_active: !target.is_active });
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    }

    const products = getLocalCollection('products', initialProducts);
    const updated = products.filter(p => p.id !== id);
    setLocalCollection('products', updated);
    return true;
  },

  async deleteMany(ids = []) {
    if (ids.length === 0) return true;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      return true;
    }

    const products = getLocalCollection('products', initialProducts);
    const updated = products.filter(p => !ids.includes(p.id));
    setLocalCollection('products', updated);
    return true;
  }
};

// ============================================================================
// ORDERS & ORDER ITEMS
// ============================================================================

export const orderService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, customer:customers(*)`)
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data;
    }

    const orders = getLocalCollection('orders', initialOrders);
    const customers = getLocalCollection('customers', initialCustomers);
    return orders.map(ord => ({
      ...ord,
      customer: customers.find(c => c.id === ord.customer_id) || null
    })).sort((a, b) => new Date(b.created_at || b.order_date) - new Date(a.created_at || a.order_date));
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data: order, error: ordErr } = await supabase
        .from('orders')
        .select(`*, customer:customers(*)`)
        .eq('id', id)
        .single();
      if (ordErr) throw ordErr;

      const { data: items, error: itemErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      if (itemErr) throw itemErr;

      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .order('payment_date', { ascending: false });
      if (payErr) throw payErr;

      const { data: statusHistory, error: statusError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('changed_at', { ascending: false });
      if (statusError) throw statusError;

      const { data: deliveryHistory, error: deliveryError } = await supabase
        .from('delivery_history')
        .select('*')
        .eq('order_id', id)
        .order('updated_at', { ascending: false });
      if (deliveryError) throw deliveryError;

      return {
        ...order,
        items: items || [],
        payments: payments || [],
        status_history: statusHistory || [],
        delivery_history: deliveryHistory || []
      };
    }

    const orders = getLocalCollection('orders', initialOrders);
    const order = orders.find(o => o.id === id);
    if (!order) return null;

    const customers = getLocalCollection('customers', initialCustomers);
    const customer = customers.find(c => c.id === order.customer_id) || null;

    const allItems = getLocalCollection('order_items', initialOrderItems);
    const items = allItems.filter(i => i.order_id === id);

    const allPayments = getLocalCollection('payments', initialPayments);
    const payments = allPayments.filter(p => p.order_id === id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

    const allStatusHistory = getLocalCollection('status_history', initialStatusHistory);
    const statusHistory = allStatusHistory.filter(h => h.order_id === id).sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    const allDeliveryHistory = getLocalCollection('delivery_history', initialDeliveryHistory);
    const deliveryHistory = allDeliveryHistory.filter(d => d.order_id === id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return {
      ...order,
      customer,
      items,
      payments,
      status_history: statusHistory,
      delivery_history: deliveryHistory
    };
  },

  async create(orderData, items = [], initialPayment = null, user = null) {
    const totals = calculateOrderTotals(items, orderData.additional_charges, orderData.discount);
    const advanceAmount = initialPayment && Number(initialPayment.amount) > 0 ? Number(initialPayment.amount) : 0;
    if (advanceAmount > totals.total_amount) {
      throw new Error('Advance payment cannot exceed the order total.');
    }

    // If customer_id is not given, auto find or create customer from customer_name & whatsapp
    let customerId = orderData.customer_id;
    if (!customerId && orderData.customer_name) {
      const customers = await customerService.getAll();
      const cleanWa = (orderData.whatsapp || '').replace(/[^\d]/g, '');
      const existing = customers.find(c => {
        const cPhone = (c.whatsapp || c.phone || '').replace(/[^\d]/g, '');
        return cleanWa && cPhone && (cPhone === cleanWa || cPhone.endsWith(cleanWa) || cleanWa.endsWith(cPhone));
      });

      if (existing) {
        customerId = existing.id;
        // Update customer location if not set
        if (orderData.location && !existing.address) {
          await customerService.update(existing.id, { address: orderData.location });
        }
      } else {
        const newCust = await customerService.create({
          full_name: orderData.customer_name,
          phone: orderData.whatsapp || '+94 77 000 0000',
          whatsapp: orderData.whatsapp || '',
          address: orderData.location || '',
          notes: 'Customer created during order placement'
        }, user?.id);
        customerId = newCust.id;
      }
    }

    const balance = calculateRemainingBalance(totals.total_amount, advanceAmount);
    const paymentStatus = derivePaymentStatus(totals.total_amount, advanceAmount);

    const generatedOrderNumber = orderData.order_number || `WED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Build combined notes with order_name if provided
    let combinedNotes = orderData.notes || '';
    if (orderData.order_name) {
      combinedNotes = combinedNotes ? `[${orderData.order_name}] - ${combinedNotes}` : orderData.order_name;
    }
    if (orderData.location) {
      combinedNotes = combinedNotes ? `${combinedNotes} • Delivery: ${orderData.location}` : `Delivery: ${orderData.location}`;
    }

    if (isSupabaseConfigured) {
      const orderPayload = {
        order_number: generatedOrderNumber,
        customer_id: customerId,
        order_date: orderData.order_date || new Date().toISOString().split('T')[0],
        delivery_date: orderData.delivery_date,
        delivery_location: orderData.location || '',
        status: orderData.status || 'New',
        payment_status: paymentStatus,
        subtotal: totals.subtotal,
        additional_charges: totals.additional_charges,
        discount: totals.discount,
        total_amount: totals.total_amount,
        total_paid: advanceAmount,
        balance_due: balance,
        notes: combinedNotes,
        created_by: user?.id || null
      };

      const orderItemsPayload = items.map(itm => ({
        product_id: itm.product_id || null,
        product_name: itm.product_name,
        size: itm.size || 'Standard',
        quantity: itm.quantity,
        unit_price: itm.unit_price,
        subtotal: itm.subtotal,
        customization_details: itm.customization_details || '',
        special_instructions: itm.special_instructions || '',
        image_url: itm.image_url || null
      }));

      const initialPaymentPayload = advanceAmount > 0
        ? {
            amount: advanceAmount,
            payment_method: initialPayment.payment_method || 'Cash',
            payment_reference: initialPayment.payment_reference || '',
            notes: 'Advance deposit on order placement',
            recorded_by: user?.id || null
          }
        : null;

      const { data: createdOrder, error } = await supabase.rpc('create_order_bundle', {
        p_order: orderPayload,
        p_items: orderItemsPayload,
        p_initial_payment: initialPaymentPayload,
        p_status_notes: `Order initiated: ${orderData.order_name || 'Standard order'}`
      });
      if (error) throw error;
      return createdOrder;
    }

    // Local Storage Mode
    const orders = getLocalCollection('orders', initialOrders);
    const orderItems = getLocalCollection('order_items', initialOrderItems);
    const payments = getLocalCollection('payments', initialPayments);
    const statusHistory = getLocalCollection('status_history', initialStatusHistory);

    const newOrderId = `ord-${Date.now()}`;
    const newOrderNumber = orderData.order_number || `WED-${new Date().getFullYear()}-${1000 + orders.length + 1}`;

    const newOrder = {
      id: newOrderId,
      order_number: newOrderNumber,
      order_name: orderData.order_name || '',
      customer_id: customerId,
      order_date: orderData.order_date || new Date().toISOString().split('T')[0],
      delivery_date: orderData.delivery_date,
      delivery_location: orderData.location || '',
      status: orderData.status || 'New',
      payment_status: paymentStatus,
      subtotal: totals.subtotal,
      additional_charges: totals.additional_charges,
      discount: totals.discount,
      total_amount: totals.total_amount,
      total_paid: advanceAmount,
      balance_due: balance,
      notes: combinedNotes,
      created_by: user?.id || 'admin',
      created_at: new Date().toISOString()
    };

    orders.unshift(newOrder);
    setLocalCollection('orders', orders);

    const newItems = items.map((itm, i) => ({
      id: `itm-${Date.now()}-${i}`,
      order_id: newOrderId,
      product_id: itm.product_id || null,
      product_name: itm.product_name,
      size: itm.size || 'Standard',
      quantity: itm.quantity,
      unit_price: itm.unit_price,
      subtotal: itm.subtotal,
      customization_details: itm.customization_details || '',
      special_instructions: itm.special_instructions || '',
      image_url: itm.image_url || null
    }));

    orderItems.push(...newItems);
    setLocalCollection('order_items', orderItems);

    if (advanceAmount > 0) {
      const newPayment = {
        id: `pay-${Date.now()}`,
        payment_number: `PAY-${1000 + payments.length + 1}`,
        order_id: newOrderId,
        payment_date: new Date().toISOString(),
        amount: advanceAmount,
        payment_method: initialPayment.payment_method || 'Cash',
        payment_reference: initialPayment.payment_reference || '',
        notes: 'Advance deposit on order placement',
        recorded_by: user?.id || 'emp-001'
      };
      payments.push(newPayment);
      setLocalCollection('payments', payments);
    }

    statusHistory.push({
      id: `sh-${Date.now()}`,
      order_id: newOrderId,
      previous_status: null,
      new_status: newOrder.status,
      notes: 'Order created',
      changed_by: user?.id || 'emp-001',
      changed_at: new Date().toISOString()
    });
    setLocalCollection('status_history', statusHistory);

    return newOrder;
  },

  async updateStatus(orderId, newStatus, notes = '', user = null) {
    if (isSupabaseConfigured) {
      const { data: order, error: orderError } = await supabase
        .from('orders').select('status').eq('id', orderId).single();
      if (orderError) throw orderError;

      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;

      const { error: historyError } = await supabase.from('order_status_history').insert([{
        order_id: orderId,
        previous_status: order.status,
        new_status: newStatus,
        notes: notes || `Status updated to ${newStatus}`,
        changed_by: user?.id || null
      }]);
      if (historyError) throw historyError;

      return data;
    }

    const orders = getLocalCollection('orders', initialOrders);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const prevStatus = orders[idx].status;
    orders[idx].status = newStatus;
    orders[idx].updated_at = new Date().toISOString();
    setLocalCollection('orders', orders);

    const statusHistory = getLocalCollection('status_history', initialStatusHistory);
    statusHistory.push({
      id: `sh-${Date.now()}`,
      order_id: orderId,
      previous_status: prevStatus,
      new_status: newStatus,
      notes: notes || `Status changed to ${newStatus}`,
      changed_by: user?.id || 'emp-001',
      changed_at: new Date().toISOString()
    });
    setLocalCollection('status_history', statusHistory);

    return orders[idx];
  },

  async updateTracking(orderId, trackingNumber, courierName = 'SL Post', user = null) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .update({ tracking_number: trackingNumber, courier_name: courierName })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const orders = getLocalCollection('orders', initialOrders);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    orders[idx].tracking_number = trackingNumber;
    orders[idx].courier_name = courierName;
    orders[idx].updated_at = new Date().toISOString();
    setLocalCollection('orders', orders);

    return orders[idx];
  },

  async updateFinancials(orderId, { total_amount, total_paid, discount = 0, additional_charges = 0 }, user = null) {
    if (isSupabaseConfigured) {
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders').select('total_paid').eq('id', orderId).single();
      if (fetchError) throw fetchError;

      const newTotal = Number(total_amount);
      const paid = total_paid !== undefined && total_paid !== null
        ? Number(total_paid)
        : Number(existingOrder.total_paid || 0);
      const { data, error } = await supabase
        .from('orders')
        .update({
          total_amount: newTotal,
          total_paid: paid,
          discount: Number(discount),
          additional_charges: Number(additional_charges),
          balance_due: Math.max(0, Number((newTotal - paid).toFixed(2))),
          payment_status: derivePaymentStatus(newTotal, paid)
        })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const orders = getLocalCollection('orders', initialOrders);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = orders[idx];
    const newTotal = Number(total_amount);
    const paid = total_paid !== undefined && total_paid !== null ? Number(total_paid) : Number(order.total_paid || 0);
    const newBalance = Math.max(0, Number((newTotal - paid).toFixed(2)));
    const newPaymentStatus = derivePaymentStatus(newTotal, paid);

    order.total_amount = newTotal;
    order.total_paid = paid;
    order.discount = Number(discount);
    order.additional_charges = Number(additional_charges);
    order.balance_due = newBalance;
    order.payment_status = newPaymentStatus;
    order.updated_at = new Date().toISOString();

    setLocalCollection('orders', orders);
    return order;
  },

  async updateDates(orderId, { order_date, delivery_date }, user = null) {
    if (isSupabaseConfigured) {
      const updates = {};
      if (order_date) updates.order_date = order_date;
      if (delivery_date) updates.delivery_date = delivery_date;
      const { data, error } = await supabase
        .from('orders').update(updates).eq('id', orderId).select().single();
      if (error) throw error;
      return data;
    }

    const orders = getLocalCollection('orders', initialOrders);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    if (order_date) orders[idx].order_date = order_date;
    if (delivery_date) orders[idx].delivery_date = delivery_date;
    orders[idx].updated_at = new Date().toISOString();

    setLocalCollection('orders', orders);
    return orders[idx];
  },

  async delete(orderId) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      return true;
    }

    let orders = getLocalCollection('orders', initialOrders);
    orders = orders.filter(o => o.id !== orderId);
    setLocalCollection('orders', orders);

    let items = getLocalCollection('order_items', initialOrderItems);
    items = items.filter(i => i.order_id !== orderId);
    setLocalCollection('order_items', items);

    let payments = getLocalCollection('payments', initialPayments);
    payments = payments.filter(p => p.order_id !== orderId);
    setLocalCollection('payments', payments);

    return true;
  }
};

// ============================================================================
// PAYMENTS
// ============================================================================

export const paymentService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, order:orders(*, customer:customers(*))`)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    }

    const payments = getLocalCollection('payments', initialPayments);
    const orders = getLocalCollection('orders', initialOrders);
    const customers = getLocalCollection('customers', initialCustomers);

    return payments.map(p => {
      const order = orders.find(o => o.id === p.order_id);
      const customer = order ? customers.find(c => c.id === order.customer_id) : null;
      return {
        ...p,
        order: order ? { ...order, customer } : null
      };
    }).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  },

  async create(paymentData, user = null) {
    const amount = Number(paymentData.amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');

    if (isSupabaseConfigured) {
      const paymentNumber = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        payment_number: paymentNumber,
        order_id: paymentData.order_id,
        amount: amount,
        payment_method: paymentData.payment_method || 'Cash',
        payment_reference: paymentData.payment_reference || '',
        notes: paymentData.notes || '',
        recorded_by: user?.id || null
      };
      const { data, error } = await supabase.from('payments').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }

    // Local Storage Mode: Add payment and recalculate order total
    const payments = getLocalCollection('payments', initialPayments);
    const orders = getLocalCollection('orders', initialOrders);

    const orderIdx = orders.findIndex(o => o.id === paymentData.order_id);
    if (orderIdx === -1) throw new Error('Order not found');

    const targetOrder = orders[orderIdx];
    const newTotalPaid = Number((Number(targetOrder.total_paid || 0) + amount).toFixed(2));
    const newBalance = Math.max(0, Number((Number(targetOrder.total_amount) - newTotalPaid).toFixed(2)));
    const newPaymentStatus = derivePaymentStatus(targetOrder.total_amount, newTotalPaid);

    targetOrder.total_paid = newTotalPaid;
    targetOrder.balance_due = newBalance;
    targetOrder.payment_status = newPaymentStatus;
    targetOrder.updated_at = new Date().toISOString();
    setLocalCollection('orders', orders);

    const newPayment = {
      id: `pay-${Date.now()}`,
      payment_number: `PAY-${1000 + payments.length + 1}`,
      order_id: paymentData.order_id,
      payment_date: paymentData.payment_date || new Date().toISOString(),
      amount: amount,
      payment_method: paymentData.payment_method || 'Cash',
      payment_reference: paymentData.payment_reference || '',
      notes: paymentData.notes || '',
      recorded_by: user?.id || 'emp-001'
    };

    payments.unshift(newPayment);
    setLocalCollection('payments', payments);

    return newPayment;
  }
};

// ============================================================================
// DELIVERIES
// ============================================================================

export const deliveryService = {
  async getAll() {
    const orders = await orderService.getAll();
    return orders.map(ord => ({
      order_id: ord.id,
      order_number: ord.order_number,
      customer_name: ord.customer?.full_name || 'Walk-in Customer',
      phone: ord.customer?.phone || '',
      whatsapp: ord.customer?.whatsapp || ord.customer?.phone || '',
      delivery_address: ord.delivery_location || ord.customer?.address || 'Pickup at Wedora Studio',
      delivery_date: ord.delivery_date,
      order_status: ord.status,
      delivery_status: ord.status === 'Delivered' ? 'Delivered' : (ord.status === 'Out for Delivery' ? 'In Transit' : 'Scheduled'),
      tracking_number: ord.tracking_number || '',
      courier_name: ord.courier_name || 'SL Post',
      urgency: getDeliveryUrgency(ord.delivery_date, ord.status),
      notes: ord.notes || ''
    }));
  },

  async updateDelivery(orderId, newStatus, deliveryPerson = '', notes = '', trackingNumber = '', user = null) {
    if (trackingNumber) {
      await orderService.updateTracking(orderId, trackingNumber, deliveryPerson || 'SL Post', user);
    }
    if (isSupabaseConfigured) {
      let orderStatusUpdate = null;
      if (newStatus === 'Delivered') {
        orderStatusUpdate = 'Delivered';
      } else if (newStatus === 'Out for Delivery') {
        orderStatusUpdate = 'Out for Delivery';
      }

      if (orderStatusUpdate) {
        await orderService.updateStatus(orderId, orderStatusUpdate, notes, user);
      }

      const { data, error } = await supabase.from('delivery_history').insert([{
        order_id: orderId,
        status: newStatus,
        notes: notes || '',
        delivery_person: deliveryPerson || '',
        updated_by: user?.id || null
      }]).select().single();
      if (error) throw error;
      return data;
    }

    let orderStatusUpdate = null;
    if (newStatus === 'Delivered') {
      orderStatusUpdate = 'Delivered';
    } else if (newStatus === 'Out for Delivery') {
      orderStatusUpdate = 'Out for Delivery';
    }

    if (orderStatusUpdate) {
      await orderService.updateStatus(orderId, orderStatusUpdate, notes, user);
    }

    const deliveryHistory = getLocalCollection('delivery_history', initialDeliveryHistory);
    const newEntry = {
      id: `del-${Date.now()}`,
      order_id: orderId,
      status: newStatus,
      notes: notes || '',
      delivery_person: deliveryPerson || '',
      updated_by: user?.id || 'emp-001',
      updated_at: new Date().toISOString()
    };
    deliveryHistory.unshift(newEntry);
    setLocalCollection('delivery_history', deliveryHistory);
    return newEntry;
  }
};

// ============================================================================
// DASHBOARD & REPORTS
// ============================================================================

export const reportService = {
  async getDashboardMetrics() {
    const orders = await orderService.getAll();
    const payments = await paymentService.getAll();

    const todayStr = new Date().toISOString().split('T')[0];

    const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
    const todayOrders = orders.filter(o => o.order_date === todayStr);
    const pendingOrders = orders.filter(o => ['New', 'Confirmed'].includes(o.status));
    const preparingOrders = orders.filter(o => o.status === 'Preparing');
    const completedOrders = orders.filter(o => o.status === 'Delivered');

    const totalSales = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outstandingBalances = nonCancelledOrders.reduce((sum, o) => sum + Number(o.balance_due || 0), 0);

    const upcomingDeliveries = orders.filter(o => {
      const urgency = getDeliveryUrgency(o.delivery_date, o.status);
      return ['today', 'upcoming', 'overdue'].includes(urgency);
    });

    return {
      total_orders: orders.length,
      today_orders: todayOrders.length,
      pending_orders: pendingOrders.length,
      preparing_orders: preparingOrders.length,
      completed_orders: completedOrders.length,
      total_sales: totalSales,
      total_payments: totalPaymentsReceived,
      outstanding_balances: outstandingBalances,
      upcoming_deliveries_count: upcomingDeliveries.length,
      recent_orders: orders.slice(0, 5),
      urgent_deliveries: upcomingDeliveries.slice(0, 5)
    };
  },

  async getSalesAnalytics(timeframe = '30days') {
    const orders = await orderService.getAll();
    const payments = await paymentService.getAll();
    const nonCancelled = orders.filter(o => o.status !== 'Cancelled');

    // Aggregate daily sales for the last 14 days
    const dailyMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateKey = d.toISOString().split('T')[0];
      const displayKey = d.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
      dailyMap[dateKey] = { date: displayKey, fullDate: dateKey, sales: 0, payments: 0, orders: 0 };
    }

    nonCancelled.forEach(o => {
      if (dailyMap[o.order_date]) {
        dailyMap[o.order_date].sales += Number(o.total_amount || 0);
        dailyMap[o.order_date].orders += 1;
      }
    });

    payments.forEach(p => {
      const payDate = p.payment_date?.split('T')[0];
      if (payDate && dailyMap[payDate]) {
        dailyMap[payDate].payments += Number(p.amount || 0);
      }
    });

    const dailySalesChart = Object.values(dailyMap);

    // Status breakdown
    const statusCounts = {
      New: 0,
      Confirmed: 0,
      Preparing: 0,
      Ready: 0,
      'Out for Delivery': 0,
      Delivered: 0,
      Cancelled: 0
    };
    orders.forEach(o => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status] += 1;
      }
    });

    const statusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Payment methods breakdown
    const methodMap = { Cash: 0, 'Bank Transfer': 0, Other: 0 };
    payments.forEach(p => {
      const method = p.payment_method || 'Other';
      methodMap[method] = (methodMap[method] || 0) + Number(p.amount || 0);
    });

    const paymentMethodsChart = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    return {
      dailySalesChart,
      statusChart,
      paymentMethodsChart,
      totalRevenue: nonCancelled.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      totalReceived: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      totalOutstanding: nonCancelled.reduce((sum, o) => sum + Number(o.balance_due || 0), 0),
      orderCount: nonCancelled.length
    };
  }
};

// ============================================================================
// EMPLOYEES & SETTINGS
// ============================================================================

export const employeeService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data;
    }
    return getLocalCollection('employees', initialEmployees);
  },

  async create(employeeData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.functions.invoke('admin-invite-employee', {
        body: employeeData
      });
      if (error) throw error;
      return data.employee;
    }

    const employees = getLocalCollection('employees', initialEmployees);
    const newEmp = {
      ...employeeData,
      id: `emp-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    employees.push(newEmp);
    setLocalCollection('employees', employees);
    return newEmp;
  },

  async update(id, updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const employees = getLocalCollection('employees', initialEmployees);
    const idx = employees.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Employee not found');
    employees[idx] = { ...employees[idx], ...updates, updated_at: new Date().toISOString() };
    setLocalCollection('employees', employees);
    return employees[idx];
  }
};

export const settingsService = {
  async get() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('business_settings').select('*').eq('id', 'default').single();
      if (error) throw error;
      return data;
    }
    return getLocalCollection('settings', initialBusinessSettings);
  },

  async update(updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('business_settings').update(updates).eq('id', 'default').select().single();
      if (error) throw error;
      return data;
    }
    const current = getLocalCollection('settings', initialBusinessSettings);
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    setLocalCollection('settings', updated);
    return updated;
  }
};

// ============================================================================
// EXPENSES
// ============================================================================

export const expenseService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    }
    const expenses = getLocalCollection('expenses', initialExpenses);
    return expenses.sort((a, b) => new Date(b.expense_date || b.created_at) - new Date(a.expense_date || a.created_at));
  },

  async getById(id) {
    const list = await this.getAll();
    return list.find(e => e.id === id) || null;
  },

  async create(expenseData, user = null) {
    const newExpense = {
      title: expenseData.title?.trim(),
      category: expenseData.category || 'Other',
      amount: Number(expenseData.amount) || 0,
      expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
      payment_method: expenseData.payment_method || 'Cash',
      reference_number: expenseData.reference_number?.trim() || '',
      vendor: expenseData.vendor?.trim() || '',
      notes: expenseData.notes?.trim() || '',
      created_by: user?.id || null
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('expenses').insert([newExpense]).select().single();
      if (error) throw error;
      return data;
    }

    const list = getLocalCollection('expenses', initialExpenses);
    const localExpense = {
      ...newExpense,
      id: `exp-${Date.now()}`,
      expense_number: `EXP-${1000 + list.length + 1}`,
      created_by: user?.id || 'admin',
      created_at: new Date().toISOString()
    };
    list.unshift(localExpense);
    setLocalCollection('expenses', list);
    return localExpense;
  },

  async update(id, updates, user = null) {
    if (isSupabaseConfigured) {
      const payload = {
        ...updates,
        amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
        updated_by: user?.id || null
      };
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      const { data, error } = await supabase
        .from('expenses').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const list = getLocalCollection('expenses', initialExpenses);
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Expense record not found');

    const updated = {
      ...list[idx],
      ...updates,
      amount: updates.amount !== undefined ? Number(updates.amount) : list[idx].amount,
      updated_by: user?.id || list[idx].updated_by,
      updated_at: new Date().toISOString()
    };

    list[idx] = updated;
    setLocalCollection('expenses', list);
    return updated;
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const list = getLocalCollection('expenses', initialExpenses);
    const filtered = list.filter(e => e.id !== id);
    setLocalCollection('expenses', filtered);
    return true;
  }
};
