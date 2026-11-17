import React, { useState, useEffect } from 'react';
import { reportService } from '../services/dataService';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency } from '../utils/formatters';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  ShoppingBag,
  BarChart3,
  Download,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const METHOD_COLORS = { Cash: '#D4AF37', 'Bank Transfer': '#0D1B2A', Other: '#94A3B8' };
const STATUS_COLORS = {
  New: '#3B82F6', Confirmed: '#1E314B', Preparing: '#F59E0B',
  Ready: '#8B5CF6', 'Out for Delivery': '#D4AF37', Delivered: '#10B981', Cancelled: '#EF4444'
};

export const SalesReports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('14days');

  const { refreshTrigger } = useData();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await reportService.getSalesAnalytics(timeframe);
        setAnalytics(data);
      } catch (err) {
        showToast(err.message || 'Failed to load analytics data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeframe, refreshTrigger]);

  const handleExportCSV = () => {
    if (!analytics?.dailySalesChart?.length) return;
    const headers = ['Date', 'Sales (LKR)', 'Payments Received (LKR)', 'Orders'];
    const rows = analytics.dailySalesChart.map(d => [d.date, d.sales, d.payments, d.orders]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wedora_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sales report exported as CSV', 'success');
  };

  if (loading || !analytics) {
    return <Spinner text="Generating sales analytics..." />;
  }

  return (
    <div className="animate-fade-in">
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="filter-tabs">
          {[
            { key: '14days', label: 'Last 14 Days' },
            { key: '30days', label: 'Last 30 Days' },
            { key: 'month', label: 'This Month' },
            { key: 'year', label: 'This Year' }
          ].map(opt => (
            <button
              key={opt.key}
              className={`filter-tab ${timeframe === opt.key ? 'active' : ''}`}
              onClick={() => setTimeframe(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button variant="secondary" icon={Download} onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          label="Total Order Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtext="All confirmed orders (excl. cancelled)"
          icon={TrendingUp}
          accent="gold"
          iconBg="var(--gold-100)"
          iconColor="var(--gold-600)"
        />
        <StatCard
          label="Cash Collected"
          value={formatCurrency(analytics.totalReceived)}
          subtext="Actual bank + cash payments received"
          icon={CreditCard}
          accent="emerald"
          iconBg="var(--status-success-bg)"
          iconColor="#059669"
        />
        <StatCard
          label="Outstanding Receivables"
          value={formatCurrency(analytics.totalOutstanding)}
          subtext="Pending balance settlements"
          icon={AlertCircle}
          accent="rose"
          iconBg="var(--status-danger-bg)"
          iconColor="#EF4444"
        />
        <StatCard
          label="Orders Processed"
          value={analytics.orderCount}
          subtext="Confirmed & completed"
          icon={ShoppingBag}
          accent="navy"
          iconBg="var(--navy-100)"
          iconColor="var(--navy-900)"
        />
      </div>

      {/* Daily Sales vs Payments Chart */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader
          title="Daily Sales Revenue vs. Cash Collected (LKR)"
          subtitle="Important: Cancelled orders are excluded. Sales = Order total placed; Payments = Actual money received"
        />
        <CardBody>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailySalesChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A059" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C5A059" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name === 'sales' ? 'Order Revenue' : 'Payments Collected']}
                  contentStyle={{ backgroundColor: '#0D1B2A', borderRadius: 8, border: 'none', color: '#FFF', fontSize: 12 }}
                />
                <Legend formatter={(value) => value === 'sales' ? 'Order Revenue (LKR)' : 'Payments Received (LKR)'} />
                <Area type="monotone" dataKey="sales" stroke="#C5A059" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="payments" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#payGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Bottom Pie Charts Grid */}
      <div className="charts-grid">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader
            title="Orders by Status"
            subtitle="Distribution across current order stages"
          />
          <CardBody>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusChart.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {analytics.statusChart.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0D1B2A', borderRadius: 8, border: 'none', color: '#FFF', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Revenue by Payment Method */}
        <Card>
          <CardHeader
            title="Revenue by Payment Method"
            subtitle="Breakdown of how clients are paying"
          />
          <CardBody>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.paymentMethodsChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Amount']}
                    contentStyle={{ backgroundColor: '#0D1B2A', borderRadius: 8, border: 'none', color: '#FFF', fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {analytics.paymentMethodsChart.map((entry, i) => (
                      <Cell key={i} fill={METHOD_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
