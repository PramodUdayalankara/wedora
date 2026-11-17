import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { NewOrder } from './pages/NewOrder';
import { OrderDetails } from './pages/OrderDetails';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Products } from './pages/Products';
import { Payments } from './pages/Payments';
import { Invoices } from './pages/Invoices';
import { DeliveryManagement } from './pages/DeliveryManagement';
import { SalesReports } from './pages/SalesReports';
import { Expenses } from './pages/Expenses';
import { Employees } from './pages/Employees';
import { BackupRestore } from './pages/BackupRestore';
import { Settings } from './pages/Settings';

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

export const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/new" element={<NewOrder />} />
                <Route path="/orders/:id" element={<OrderDetails />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />
                <Route path="/products" element={<Products />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route
                  path="/expenses"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Expenses />
                    </ProtectedRoute>
                  }
                />
                <Route path="/deliveries" element={<DeliveryManagement />} />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <SalesReports />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only Routes */}
                <Route
                  path="/employees"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Employees />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/backup"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <BackupRestore />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
