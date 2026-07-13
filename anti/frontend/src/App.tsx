import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import SupplierTab from './components/master/SupplierTab';
import RawMaterialTab from './components/master/RawMaterialTab';
import CustomerTab from './components/master/CustomerTab';
import PatternMaterialTab from './components/master/PatternMaterialTab';
import ProductTab from './components/master/ProductTab';
import CoreBoxTab from './components/master/CoreBoxTab';
import PatternTab from './components/master/PatternTab';
import UserAccessTab from './components/master/UserAccessTab';
import PurchaseInwardTab from './components/purchases/PurchaseInwardTab';
import PurchaseRejectionTab from './components/purchases/PurchaseRejectionTab';
import PurchaseReturnTab from './components/purchases/PurchaseReturnTab';
import DashboardLayout from './components/layout/DashboardLayout';
import MaterialStockTab from './components/inventory/MaterialStockTab';
import MaterialStockLogTab from './components/inventory/MaterialStockLogTab';
import ProductStockTab from './components/inventory/ProductStockTab';
import ProductStockLogTab from './components/inventory/ProductStockLogTab';
import { ToastProvider } from './contexts/ToastContext';
import GlobalLoader from './components/common/GlobalLoader';
import WelcomeDashboard from './components/master/WelcomeDashboard';
import NetworkStatusDetector from './components/common/NetworkStatusDetector';
import './App.css';

const pathPermissions: Record<string, string> = {
  '/dashboard': 'can_access_dashboard',
  '/settings/supplier-master': 'can_access_supplier_master',
  '/settings/raw-material-master': 'can_access_raw_material_master',
  '/settings/customer-master': 'can_access_customer_master',
  '/settings/pattern-material-master': 'can_access_pattern_material_master',
  '/settings/product-master': 'can_access_product_master',
  '/settings/core-box-master': 'can_access_core_box_master',
  '/settings/pattern-master': 'can_access_pattern_master',
  '/purchases/purchase-inward': 'can_access_purchase_inward',
  '/purchases/purchase-rejection': 'can_access_purchase_rejection',
  '/purchases/purchase-return': 'can_access_purchase_return',
  '/inventory/material-stock': 'can_access_material_stock',
  '/inventory/material-stock-log': 'can_access_material_stock_log',
  '/inventory/product-stock': 'can_access_product_stock',
  '/inventory/product-stock-log': 'can_access_product_stock_log'
};

// Protected Route Component Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = sessionStorage.getItem('access_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isSuperuser = sessionStorage.getItem('is_superuser') === 'true';
  const path = location.pathname;

  if ((path === '/settings/user-access' || path === '/settings/user_access') && !isSuperuser) {
    return <Navigate to="/dashboard" replace />;
  }

  const permissionKey = pathPermissions[path];
  if (permissionKey && !isSuperuser) {
    try {
      const permsStr = sessionStorage.getItem('role_permissions');
      if (permsStr) {
        const perms = JSON.parse(permsStr);
        if (!perms[permissionKey]) {
          return <Navigate to="/dashboard" replace />;
        }
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (e) {
      console.error(e);
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

function App() {
  return (
    <ToastProvider>
      <GlobalLoader />
      <NetworkStatusDetector />
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes enclosed under the Dashboard Sidebar layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <WelcomeDashboard />
              </ProtectedRoute>
            } />

            <Route path="/settings/supplier-master" element={
              <ProtectedRoute>
                <SupplierTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/raw-material-master" element={
              <ProtectedRoute>
                <RawMaterialTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/customer-master" element={
              <ProtectedRoute>
                <CustomerTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/pattern-material-master" element={
              <ProtectedRoute>
                <PatternMaterialTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/product-master" element={
              <ProtectedRoute>
                <ProductTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/core-box-master" element={
              <ProtectedRoute>
                <CoreBoxTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/user-access" element={
              <ProtectedRoute>
                <UserAccessTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/user_access" element={
              <ProtectedRoute>
                <UserAccessTab />
              </ProtectedRoute>
            } />
            <Route path="/settings/pattern-master" element={
              <ProtectedRoute>
                <PatternTab />
              </ProtectedRoute>
            } />


            <Route path="/purchases/purchase-inward" element={
              <ProtectedRoute>
                <PurchaseInwardTab />
              </ProtectedRoute>
            } />
            <Route path="/purchases/purchase-rejection" element={
              <ProtectedRoute>
                <PurchaseRejectionTab />
              </ProtectedRoute>
            } />
            <Route path="/purchases/purchase-return" element={
              <ProtectedRoute>
                <PurchaseReturnTab />
              </ProtectedRoute>
            } />
            <Route path="/inventory/material-stock" element={
              <ProtectedRoute>
                <MaterialStockTab />
              </ProtectedRoute>
            } />
            <Route path="/inventory/material-stock-log" element={
              <ProtectedRoute>
                <MaterialStockLogTab />
              </ProtectedRoute>
            } />
            <Route path="/inventory/product-stock" element={
              <ProtectedRoute>
                <ProductStockTab />
              </ProtectedRoute>
            } />
            <Route path="/inventory/product-stock-log" element={
              <ProtectedRoute>
                <ProductStockLogTab />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
