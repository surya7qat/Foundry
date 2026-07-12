import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SupplierTab from './components/master/SupplierTab';
import RawMaterialTab from './components/master/RawMaterialTab';
import CustomerTab from './components/master/CustomerTab';
import PatternMaterialTab from './components/master/PatternMaterialTab';
import ProductTab from './components/master/ProductTab';
import CoreBoxTab from './components/master/CoreBoxTab';
import PatternTab from './components/master/PatternTab';
import PurchaseInwardTab from './components/purchases/PurchaseInwardTab';
import PurchaseRejectionTab from './components/purchases/PurchaseRejectionTab';
import PurchaseReturnTab from './components/purchases/PurchaseReturnTab';
import DashboardLayout from './components/layout/DashboardLayout';
import { ToastProvider } from './contexts/ToastContext';
import GlobalLoader from './components/common/GlobalLoader';
import WelcomeDashboard from './components/master/WelcomeDashboard';
import './App.css';


// Protected Route Component Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = sessionStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

function App() {
  return (
    <ToastProvider>
      <GlobalLoader />
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
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
