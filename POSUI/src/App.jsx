import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="apps/bucket" element={<PosTerminal />} />
          <Route path="apps/invoice" element={<InvoiceList />} />
          <Route path="apps/invoice/:id" element={<InvoiceDetail />} />
          <Route path="apps/product" element={<ProductList />} />
          <Route path="apps/materialInward" element={<MaterialInward />} />
          <Route path="apps/purchaseOrder" element={<PurchaseOrderList />} />
          <Route path="apps/returns" element={<MaterialReturnList />} />
          <Route path="apps/vendor" element={<VendorList />} />
          <Route path="apps/customer" element={<CustomerList />} />
          <Route path="apps/reports" element={<ReportsHub />} />
          <Route path="apps/dailySales" element={<DailySalesReport />} />
          <Route path="apps/vendorWiseSale" element={<VendorWiseSalesReport />} />
          <Route path="apps/vendorWiseExpiredStock" element={<VendorWiseExpiredStockReport />} />
          <Route path="apps/settings" element={<SettingsPage />} />
          <Route path="apps/users" element={<UserManagement />} />
          <Route path="403" element={<Forbidden403 />} />
          <Route path="*" element={<NotFound404 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
