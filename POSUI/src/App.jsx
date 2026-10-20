import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/apps/dashboard/Dashboard';
import PosTerminal from './pages/apps/bucket/PosTerminal';
import InvoiceList from './pages/apps/invoice/InvoiceList';
import InvoiceDetail from './pages/apps/invoice/InvoiceDetail';
import ProductList from './pages/apps/product/ProductList';
import MaterialInward from './pages/apps/materialInward/MaterialInward';
import PurchaseOrderList from './pages/apps/purchaseOrder/PurchaseOrderList';
import MaterialReturnList from './pages/apps/returns/MaterialReturnList';
import VendorList from './pages/apps/vendor/VendorList';
import CustomerList from './pages/apps/customer/CustomerList';
import ReportsHub from './pages/apps/reports/ReportsHub';
import DailySalesReport from './pages/apps/reports/DailySalesReport';
import VendorWiseSalesReport from './pages/apps/reports/VendorWiseSalesReport';
import VendorWiseExpiredStockReport from './pages/apps/reports/VendorWiseExpiredStockReport';
import SettingsPage from './pages/apps/settings/SettingsPage';
import UserManagement from './pages/apps/users/UserManagement';
import Forbidden403 from './pages/maintenance/Forbidden403';
import NotFound404 from './pages/maintenance/NotFound404';
import { getToken } from './_api/apiClient';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const token = getToken();

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function RoleRoute({ allowedRoles, children }) {
  const { user } = useSelector((state) => state.auth);
  const currentRole = user?.role || 'Cashier';

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

function RootIndexRedirect() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'Admin';

  if (role === 'Cashier') {
    return <Navigate to="/apps/bucket" replace />;
  }
  if (role === 'Inventory' || role === 'Inventory Manager') {
    return <Navigate to="/apps/materialInward" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RootIndexRedirect />} />
          <Route
            path="dashboard"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="apps/bucket"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Cashier']}>
                <PosTerminal />
              </RoleRoute>
            }
          />
          <Route
            path="apps/invoice"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Cashier']}>
                <InvoiceList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/invoice/:id"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Cashier']}>
                <InvoiceDetail />
              </RoleRoute>
            }
          />
          <Route
            path="apps/product"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <ProductList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/materialInward"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <MaterialInward />
              </RoleRoute>
            }
          />
          <Route
            path="apps/purchaseOrder"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <PurchaseOrderList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/returns"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <MaterialReturnList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/vendor"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <VendorList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/customer"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Cashier']}>
                <CustomerList />
              </RoleRoute>
            }
          />
          <Route
            path="apps/reports"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <ReportsHub />
              </RoleRoute>
            }
          />
          <Route
            path="apps/dailySales"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <DailySalesReport />
              </RoleRoute>
            }
          />
          <Route
            path="apps/vendorWiseSale"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <VendorWiseSalesReport />
              </RoleRoute>
            }
          />
          <Route
            path="apps/vendorWiseExpiredStock"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager', 'Inventory', 'Inventory Manager']}>
                <VendorWiseExpiredStockReport />
              </RoleRoute>
            }
          />
          <Route
            path="apps/settings"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager']}>
                <SettingsPage />
              </RoleRoute>
            }
          />
          <Route
            path="apps/users"
            element={
              <RoleRoute allowedRoles={['Admin', 'Store Manager']}>
                <UserManagement />
              </RoleRoute>
            }
          />
          <Route path="403" element={<Forbidden403 />} />
          <Route path="*" element={<NotFound404 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
