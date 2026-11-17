import { customerService, productService, orderService, paymentService, settingsService, employeeService, expenseService } from './dataService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import { WEDORA_LOGO_BASE64 } from '../assets/logoBase64';

const BACKUP_VERSION = '1.0.0';

export const backupService = {
  /**
   * Export all business data as a single JSON structure
   */
  async exportJSON() {
    const customers = await customerService.getAll();
    const products = await productService.getAll();
    const orders = await orderService.getAll();
    const payments = await paymentService.getAll();
    const settings = await settingsService.get();
    const expenses = await expenseService.getAll();

    // Fetch order items
    let allItems = [];
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('order_items').select('*');
      if (error) throw error;
      allItems = data;
    } else {
      const raw = localStorage.getItem('wedora_db_order_items');
      allItems = raw ? JSON.parse(raw) : [];
    }

    const payload = {
      app: 'WEDORA CHOCOLATE OMS',
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      metadata: {
        total_customers: customers.length,
        total_products: products.length,
        total_orders: orders.length,
        total_payments: payments.length,
        total_expenses: expenses.length
      },
      data: {
        customers,
        products,
        orders,
        order_items: allItems,
        payments,
        expenses,
        settings
      }
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wedora_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return payload;
  },

  /**
   * Export individual table as CSV
   */
  exportTableCSV(tableName, rows) {
    if (!rows || rows.length === 0) {
      alert(`No records found to export for ${tableName}`);
      return;
    }

    // Flatten keys
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          let val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wedora_${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export comprehensive Sales & Revenue Details as a luxury PDF backup
   */
  async exportSalesReportPDF() {
    const orders = await orderService.getAll();
    const payments = await paymentService.getAll();
    const settings = await settingsService.get();

    const businessName = settings?.business_name || 'WEDORA CHOCOLATES';
    const businessPhone = settings?.phone || '+94 78 359 0222';
    const businessEmail = settings?.email || 'orders@wedora.lk';
    const businessAddress = settings?.address || 'No. 45, Flower Road, Colombo 07, Sri Lanka';

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header Banner (Navy)
    doc.setFillColor(13, 27, 42); // #0D1B2A
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Gold accent line
    doc.setFillColor(212, 175, 55); // #D4AF37
    doc.rect(0, 32, pageWidth, 1.5, 'F');

    // Brand Logo
    try {
      doc.addImage(WEDORA_LOGO_BASE64, 'PNG', 12, 4, 38, 24);
    } catch (e) {}

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('WEDORA LUXURY CHOCOLATES', 55, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(212, 175, 55);
    doc.text('OFFICIAL SALES & FINANCIAL BACKUP REPORT', 55, 20);

    doc.setFontSize(7.5);
    doc.setTextColor(180, 195, 215);
    doc.text(`Phone: ${businessPhone} | Email: ${businessEmail} | Web: www.wedora.lk`, 55, 26);

    // Right header meta
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SALES ARCHIVE (PDF)', pageWidth - 14, 13, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 220, 220);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 14, 19, { align: 'right' });
    doc.text(`Total Orders Tracked: ${orders.length}`, pageWidth - 14, 25, { align: 'right' });

    // Financial KPI Cards
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalCollected = orders.reduce((sum, o) => sum + (Number(o.total_paid) || 0), 0);
    const totalOutstanding = orders.reduce((sum, o) => sum + (Number(o.balance_due) || 0), 0);
    const fullyPaidCount = orders.filter(o => o.payment_status === 'Paid').length;

    let kpiY = 38;
    const cardWidth = (pageWidth - 28 - (3 * 6)) / 4;
    const cards = [
      { title: 'TOTAL SALES BOOKED', value: formatCurrency(totalRevenue), color: [13, 27, 42], textCol: [212, 175, 55] },
      { title: 'PAYMENTS COLLECTED', value: formatCurrency(totalCollected), color: [240, 253, 244], textCol: [5, 150, 105], borderCol: [187, 247, 208] },
      { title: 'OUTSTANDING BALANCE', value: formatCurrency(totalOutstanding), color: [254, 242, 242], textCol: [220, 38, 38], borderCol: [254, 202, 202] },
      { title: 'PAID ORDERS RATIO', value: `${fullyPaidCount} / ${orders.length} (${orders.length ? Math.round((fullyPaidCount/orders.length)*100) : 0}%)`, color: [248, 250, 252], textCol: [30, 41, 59], borderCol: [226, 232, 240] }
    ];

    cards.forEach((card, idx) => {
      const cardX = 14 + idx * (cardWidth + 6);
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(cardX, kpiY, cardWidth, 16, 2, 2, 'F');
      if (card.borderCol) {
        doc.setDrawColor(card.borderCol[0], card.borderCol[1], card.borderCol[2]);
        doc.roundedRect(cardX, kpiY, cardWidth, 16, 2, 2, 'S');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(card.color[0] === 13 ? 180 : 100, card.color[1] === 27 ? 195 : 116, card.color[2] === 42 ? 215 : 139);
      doc.text(card.title, cardX + 4, kpiY + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(card.textCol[0], card.textCol[1], card.textCol[2]);
      doc.text(card.value, cardX + 4, kpiY + 12);
    });

    // Orders Table
    const tableRows = orders.map((ord, idx) => {
      const custName = ord.customer?.full_name || ord.customer_name || 'Walk-in';
      const custPhone = ord.customer?.whatsapp || ord.customer?.phone || '';
      return [
        idx + 1,
        ord.order_number || ord.id,
        `${custName}\n${custPhone}`,
        formatDate(ord.order_date),
        formatDate(ord.delivery_date),
        ord.status || 'New',
        ord.payment_status || 'Unpaid',
        formatCurrency(ord.total_amount),
        formatCurrency(ord.total_paid),
        formatCurrency(ord.balance_due)
      ];
    });

    doc.autoTable({
      startY: kpiY + 20,
      head: [['#', 'Order Ref', 'Customer & Contact', 'Order Date', 'Delivery Date', 'Status', 'Payment', 'Total (Rs)', 'Paid (Rs)', 'Balance (Rs)']],
      body: tableRows,
      theme: 'plain',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [13, 27, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold', textColor: [13, 27, 42] },
        2: { cellWidth: 55 },
        3: { cellWidth: 23 },
        4: { cellWidth: 23 },
        5: { cellWidth: 26, fontStyle: 'bold' },
        6: { cellWidth: 26, fontStyle: 'bold' },
        7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 28, halign: 'right', textColor: [5, 150, 105] },
        9: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
      },
      didDrawPage: function (data) {
        // Page footer
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 130, 145);
        doc.text(`${businessName} • ${businessAddress}`, 14, pageHeight - 6);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
      }
    });

    const fileName = `Wedora_Sales_Report_Backup_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return { fileName, totalOrders: orders.length, totalRevenue };
  },

  /**
   * Validate JSON backup file format and payload structure
   */
  validateBackupFile(parsedJson) {
    if (!parsedJson || typeof parsedJson !== 'object') {
      throw new Error('Invalid file format. Must be a valid JSON file.');
    }
    if (!parsedJson.app || !parsedJson.app.includes('WEDORA')) {
      throw new Error('Unrecognized backup file. This file was not generated by Wedora OMS.');
    }
    if (!parsedJson.data) {
      throw new Error('Backup file contains no valid data payload.');
    }

    const {
      customers = [],
      products = [],
      orders = [],
      payments = [],
      expenses = []
    } = parsedJson.data;

    return {
      isValid: true,
      version: parsedJson.version || '1.0.0',
      exported_at: parsedJson.exported_at,
      counts: {
        customers: customers.length,
        products: products.length,
        orders: orders.length,
        payments: payments.length,
        expenses: expenses.length
      }
    };
  },

  /**
   * Restore validated backup data
   */
  async restoreBackup(backupData, mode = 'overwrite') {
    const {
      customers = [],
      products = [],
      orders = [],
      order_items = [],
      payments = [],
      expenses = [],
      settings
    } = backupData.data;

    if (isSupabaseConfigured) {
      const run = async (query) => {
        const { error } = await query;
        if (error) throw error;
      };

      if (mode === 'overwrite') {
        await run(supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
        await run(supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
        await run(supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
        await run(supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
        await run(supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
        await run(supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
      }

      if (customers.length > 0) {
        await run(supabase.from('customers').upsert(customers));
      }
      if (products.length > 0) {
        await run(supabase.from('products').upsert(products));
      }
      if (orders.length > 0) {
        await run(supabase.from('orders').upsert(orders));
      }
      if (order_items.length > 0) {
        await run(supabase.from('order_items').upsert(order_items));
      }
      if (payments.length > 0) {
        await run(supabase.from('payments').upsert(payments));
      }
      if (expenses.length > 0) {
        await run(supabase.from('expenses').upsert(expenses));
      }
      if (settings) {
        await run(supabase.from('business_settings').upsert([settings]));
      }
      return true;
    }

    // Local Storage Mode
    localStorage.setItem('wedora_db_customers', JSON.stringify(customers));
    localStorage.setItem('wedora_db_products', JSON.stringify(products));
    localStorage.setItem('wedora_db_orders', JSON.stringify(orders));
    localStorage.setItem('wedora_db_order_items', JSON.stringify(order_items));
    localStorage.setItem('wedora_db_payments', JSON.stringify(payments));
    localStorage.setItem('wedora_db_expenses', JSON.stringify(expenses));
    if (settings) {
      localStorage.setItem('wedora_db_settings', JSON.stringify(settings));
    }

    return true;
  }
};
