# WEDORA – Chocolate Order Management System

![Wedora Luxury Monogram](/public/favicon.svg)

> **WEDORA** is an end-to-end, full-stack order management web application designed for a luxury customized chocolate business in Sri Lanka. It digitizes the traditional handwritten order book into a real-time, responsive business command center.

---

## 🍫 Key Features & Modules

1. **User Authentication & Role-Based Access Control (RBAC)**
   - **Administrator Role**: Unrestricted access to financial reports, employee management, database backups/restores, product catalog editing, and business settings.
   - **Employee / Staff Role**: Create orders, record customer interactions, update kitchen production stages, log deliveries, and collect payments.
   - Dual-mode architecture: Runs seamlessly with live **Supabase Auth + PostgreSQL RLS**, or out-of-the-box in **Interactive Demo Mode** with pre-seeded Sri Lankan orders.

2. **Executive Business Dashboard**
   - Live KPI cards: Total Orders, Today's Placed Orders, Orders in Preparation, Completed Deliveries, Gross Sales (LKR), Total Advance Payments Received, and Outstanding Receivables.
   - Interactive **Recharts** visualizations: Daily Sales vs. Cash Collected trends, and order status distribution mix.
   - Live dispatch timeline and recent orders ledger.

3. **Multi-Item Order Creation & Custom Chocolate Pricing**
   - Multi-item line builder: Pair items from catalog or create bespoke custom chocolate orders on-the-fly.
   - Editable unit prices: Bespoke chocolate designs, gold foil stamping, and special molds can have custom prices without losing historical order integrity.
   - Custom inscription details (e.g., *"Happy 25th Silver Jubilee Dilini & Rohan"* in cursive gold dust).
   - Packaging notes and ribbon preferences.
   - Automated financial calculations: `Subtotal = Qty × Unit Price`, `Total = Subtotal + Delivery - Discounts`, and `Remaining Balance = Total - Advance Payment`.

4. **Customer Management & Profiles**
   - Customer registry with unique code (`CUST-XXXX`), phone, WhatsApp, and physical delivery address.
   - Duplicate prevention: Automatically checks phone numbers to prevent duplicate customer records.
   - Full customer profile: Lifetime spending, pending balance receivables, and complete historical order records.
   - One-click WhatsApp link generator with pre-filled order status updates.

5. **Product & Pricing Management**
   - Manage categories: *Luxury Boxes, Custom Bars, Wedding Favors, Hampers, Bouquets, Specialty, Health & Keto*.
   - Toggle active/inactive status to temporarily disable seasonal chocolates without breaking historical orders.

6. **Payment Tracking & Receipt Ledger**
   - Record multi-part advance deposits and balance settlements (Cash, Bank Transfer, or Other).
   - Balance check: Prevents accidental payments exceeding the remaining balance.
   - Complete audit trail of who recorded each payment, reference slip numbers, and timestamps.

7. **Professional PDF Invoices (`jsPDF` + `AutoTable`)**
   - Instant client invoice generation with Wedora gold & navy branding.
   - Itemized table with custom text inscriptions, quantities, unit prices, discounts, and delivery charges.
   - Advance payments, balance due, payment status pill, and chocolate storage instructions (18-20°C).
   - Download as PDF or print directly from browser.

8. **Delivery & Logistics Management**
   - Categorized queues: *All Dispatches, Today's Deliveries, Upcoming, Overdue, and Delivered*.
   - **Overdue Alert System**: Prominently highlights delayed deliveries in red.
   - Audit trail tracking courier name and status transitions.

9. **Sales Reports & Financial Analytics**
   - Accurately separates **Order Revenue** from **Actual Cash Collected** (cancelled orders are strictly excluded).
   - Timeframe filters: Last 14 Days, Last 30 Days, This Month, This Year.
   - Export reports as CSV or print summaries.

10. **Database Backup & Safe Restore**
    - Export all business records as a single structured JSON archive or individual CSV tables.
    - Restore engine: Validates backup structure, displays record counts preview, requires admin confirmation, and safely overwrites or updates records.

11. **Business Settings & Branding**
    - Customize business name, tagline, Colombo phone/WhatsApp, address, invoice prefixes, and storage terms.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite 6
- **Routing**: React Router DOM 6
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: jsPDF & jsPDF-AutoTable
- **Date Handling**: date-fns (Asia/Colombo timezone)
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **Styling**: Pure modern CSS variables (Navy `#0D1B2A`, Soft Gold `#D4AF37`, and Cream `#F7F9FC`)
- **Hosting**: Vercel ready (`vercel.json` included)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or yarn

### 2. Installation
```bash
# Clone or navigate to the project directory
cd Wedora

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will launch at `http://localhost:3000`.

---

## 🗄 Connecting an Existing Supabase Project

The Supabase JavaScript client is already a project dependency. Without connection settings, Wedora continues to use its existing local demo mode.

### Configure the local app

Create or update `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-browser-safe-publishable-key
```

The legacy `VITE_SUPABASE_ANON_KEY` is also supported. These variables are bundled into the browser, so only use a Supabase publishable key or legacy anon public key. **Never use a service-role or secret key in a `VITE_` variable.** Restart Vite after changing environment variables.

### Database setup and migration review

The existing schema already defines profiles, customers, products, orders, order items, payments, history, and business settings. The additive migration at `supabase/migrations/20261118_complete_wedora_integration.sql`:

- Adds fields already used by the app for product metadata, delivery tracking, and business settings.
- Adds the missing `expenses` table and generated expense/payment numbers.
- Replaces the existing broad profile policies so only administrators can change roles or account status; only Auth-invited users receive active employee profiles, so public sign-ups do not gain business-data access.
- Adds a transactional RPC for creating an order with its items, optional advance payment, and initial status history.

It does not delete business records or seed sample records. Review the SQL first. For a database that has already run `supabase/schema.sql`, run only the new migration from the Supabase SQL Editor. For a fresh database, run `supabase/schema.sql` first, then the migration. `supabase/seed.sql` is optional demo catalog/customer data and should only be run if those sample rows are wanted. These files are not run automatically by the app.

The migration does not promote any account to administrator. First create/invite the intended administrator in Supabase Auth, then run a narrowly scoped SQL statement for that account:

```sql
INSERT INTO public.profiles (id, full_name, email, role, status)
SELECT id, COALESCE(NULLIF(raw_user_meta_data ->> 'full_name', ''), email), email, 'admin', 'active'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';
```

Replace the example email with that Auth user's email. Supabase login uses account email and password; employee invitations are sent through `supabase/functions/admin-invite-employee`. Deploy that function to the same project with the Supabase CLI (`supabase functions deploy admin-invite-employee --project-ref <project-ref>`). If the service-role secret is not already available to Edge Functions, add it through the Supabase Dashboard's Edge Function secrets. Never expose it in the frontend or this repository.

### Verify the connection

After applying the reviewed SQL and deploying the Edge Function, restart the app, sign in with the administrator account, and test a customer, product, order with an item, payment, delivery update, expense, and settings update. The existing loaders and toast notifications report success or database errors. The app build can be checked locally with `npm run build`.

---

## ☁️ Deploying to Vercel

The repository includes `vercel.json` with SPA URL rewrites pre-configured:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

In the Vercel Project Dashboard:
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Settings > Environment Variables**.

---

## 👥 Authentication and Roles

Supabase Auth handles live sign-in. Administrators are bootstrapped by promoting an Auth user as described above; employee invitations are administered from the existing Employees page. Active employee/admin roles are read from `public.profiles` and enforced by both route guards and RLS.

---

## 📄 License
Proprietary software built for **WEDORA Customized Chocolates**, Colombo, Sri Lanka.
#   W e d o r a  
 #   w e d o r a  
 