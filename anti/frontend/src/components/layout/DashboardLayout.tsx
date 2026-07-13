import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Box, FileText, Settings, LogOut, ChevronDown, ChevronUp, Building2, Package, Menu, X, Users, Layers, Boxes, Grid, Cpu, Shield, Database, History } from 'lucide-react';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const FoundryLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L3 9.5L16 17L29 9.5L16 2Z" fill="url(#logo-grad-1)"/>
    <path d="M3 14.5L16 22L29 14.5L26 12.8L16 18.5L6 12.8L3 14.5Z" fill="url(#logo-grad-2)"/>
    <path d="M3 19.5L16 27L29 19.5L26 17.8L16 23.5L6 17.8L3 19.5Z" fill="url(#logo-grad-3)"/>
    <defs>
      <linearGradient id="logo-grad-1" x1="16" y1="2" x2="16" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B35"/>
        <stop offset="1" stopColor="#FFA500"/>
      </linearGradient>
      <linearGradient id="logo-grad-2" x1="16" y1="12.8" x2="16" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E25822"/>
        <stop offset="1" stopColor="#D9381E"/>
      </linearGradient>
      <linearGradient id="logo-grad-3" x1="16" y1="17.8" x2="16" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9B1C1C"/>
        <stop offset="1" stopColor="#B91C1C"/>
      </linearGradient>
    </defs>
  </svg>
);

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const isSuperuser = sessionStorage.getItem('is_superuser') === 'true';
  const rolePermissionsStr = sessionStorage.getItem('role_permissions');

  const hasPermission = (permissionKey: string) => {
    if (isSuperuser) return true;
    if (!rolePermissionsStr) return false;
    try {
      const perms = JSON.parse(rolePermissionsStr);
      return !!perms[permissionKey];
    } catch {
      return false;
    }
  };

  const showPurchasesSection = hasPermission('can_access_purchase_inward') || 
                               hasPermission('can_access_purchase_rejection') || 
                               hasPermission('can_access_purchase_return');

  const showInventorySection = hasPermission('can_access_material_stock') ||
                               hasPermission('can_access_material_stock_log') ||
                               hasPermission('can_access_product_stock') ||
                               hasPermission('can_access_product_stock_log') ||
                               isSuperuser;

  const showMastersSection = hasPermission('can_access_supplier_master') ||
                             hasPermission('can_access_raw_material_master') ||
                             hasPermission('can_access_customer_master') ||
                             hasPermission('can_access_pattern_material_master') ||
                             hasPermission('can_access_product_master') ||
                             hasPermission('can_access_core_box_master') ||
                             hasPermission('can_access_pattern_master') ||
                             isSuperuser;

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FoundryLogo />
            <h2 className="brand-text">FOUNDRY</h2>
          </div>
          {/* Close button for mobile */}
          <button className="sidebar-close-btn" onClick={() => setIsMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-menu">
          {hasPermission('can_access_dashboard') && (
            <>
              <p className="menu-group-label">MAIN NAVIGATION</p>
              <button
                className={`menu-item ${isActive('/dashboard') && location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => handleNavigation('/dashboard')}
              >
                <div className="menu-item-left">
                  <LayoutDashboard size={20} className="menu-icon" />
                  <span>Dashboard</span>
                </div>
              </button>
            </>
          )}
          
          {showPurchasesSection && (
            <>
              <p className="menu-group-label" style={{ marginTop: '1.5rem' }}>PROCUREMENT</p>
              {/* Purchase Accordion Menu */}
              <div className="accordion-group">
                <button
                  className={`menu-item accordion-toggle ${isPurchaseOpen ? 'open' : ''}`}
                  onClick={() => setIsPurchaseOpen(!isPurchaseOpen)}
                >
                  <div className="menu-item-left">
                    <Box size={20} className="menu-icon" />
                    <span>Purchases</span>
                  </div>
                  <span className="chevron">
                    {isPurchaseOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                <div className={`accordion-content ${isPurchaseOpen ? 'expanded' : ''}`}>
                  {hasPermission('can_access_purchase_inward') && (
                    <button
                      className={`sub-menu-item ${isActive('/purchases/purchase-inward') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/purchases/purchase-inward')}
                    >
                      <div className="menu-item-left">
                        <FileText size={18} className="menu-icon-sub" />
                        <span>Purchase Inward</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_purchase_rejection') && (
                    <button
                      className={`sub-menu-item ${isActive('/purchases/purchase-rejection') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/purchases/purchase-rejection')}
                    >
                      <div className="menu-item-left">
                        <FileText size={18} className="menu-icon-sub" />
                        <span>Purchase Rejection</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_purchase_return') && (
                    <button
                      className={`sub-menu-item ${isActive('/purchases/purchase-return') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/purchases/purchase-return')}
                    >
                      <div className="menu-item-left">
                        <FileText size={18} className="menu-icon-sub" />
                        <span>Purchase Return</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {showInventorySection && (
            <>
              <p className="menu-group-label" style={{ marginTop: '1.5rem' }}>INVENTORY</p>
              {/* Inventory Accordion Menu */}
              <div className="accordion-group">
                <button
                  className={`menu-item accordion-toggle ${isInventoryOpen ? 'open' : ''}`}
                  onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                >
                  <div className="menu-item-left">
                    <Boxes size={20} className="menu-icon" />
                    <span>Inventory</span>
                  </div>
                  <span className="chevron">
                    {isInventoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                <div className={`accordion-content ${isInventoryOpen ? 'expanded' : ''}`}>
                  {hasPermission('can_access_material_stock') && (
                    <button
                      className={`sub-menu-item ${isActive('/inventory/material-stock') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/inventory/material-stock')}
                    >
                      <div className="menu-item-left">
                        <Database size={18} className="menu-icon-sub" />
                        <span>Material Stock</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_material_stock_log') && (
                    <button
                      className={`sub-menu-item ${isActive('/inventory/material-stock-log') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/inventory/material-stock-log')}
                    >
                      <div className="menu-item-left">
                        <History size={18} className="menu-icon-sub" />
                        <span>Material Stock Log</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_product_stock') && (
                    <button
                      className={`sub-menu-item ${isActive('/inventory/product-stock') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/inventory/product-stock')}
                    >
                      <div className="menu-item-left">
                        <Database size={18} className="menu-icon-sub" />
                        <span>Product Stock</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_product_stock_log') && (
                    <button
                      className={`sub-menu-item ${isActive('/inventory/product-stock-log') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/inventory/product-stock-log')}
                    >
                      <div className="menu-item-left">
                        <History size={18} className="menu-icon-sub" />
                        <span>Product Stock Log</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {showMastersSection && (
            <>
              <p className="menu-group-label" style={{ marginTop: '1.5rem' }}>CONFIGURATION</p>
              {/* Master Accordion Menu */}
              <div className="accordion-group">
                <button
                  className={`menu-item accordion-toggle ${isMasterOpen ? 'open' : ''}`}
                  onClick={() => setIsMasterOpen(!isMasterOpen)}
                >
                  <div className="menu-item-left">
                    <Settings size={20} className="menu-icon" />
                    <span>Masters</span>
                  </div>
                  <span className="chevron">
                    {isMasterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                <div className={`accordion-content ${isMasterOpen ? 'expanded' : ''}`}>
                  {isSuperuser && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/user-access') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/user-access')}
                    >
                      <div className="menu-item-left">
                        <Shield size={18} className="menu-icon-sub" />
                        <span>User Access</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_supplier_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/supplier-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/supplier-master')}
                    >
                      <div className="menu-item-left">
                        <Building2 size={18} className="menu-icon-sub" />
                        <span>Supplier Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_raw_material_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/raw-material-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/raw-material-master')}
                    >
                      <div className="menu-item-left">
                        <Package size={18} className="menu-icon-sub" />
                        <span>Raw Material Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_customer_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/customer-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/customer-master')}
                    >
                      <div className="menu-item-left">
                        <Users size={18} className="menu-icon-sub" />
                        <span>Customer Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_pattern_material_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/pattern-material-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/pattern-material-master')}
                    >
                      <div className="menu-item-left">
                        <Layers size={18} className="menu-icon-sub" />
                        <span>Pattern Material Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_product_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/product-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/product-master')}
                    >
                      <div className="menu-item-left">
                        <Boxes size={18} className="menu-icon-sub" />
                        <span>Product Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_core_box_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/core-box-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/core-box-master')}
                    >
                      <div className="menu-item-left">
                        <Grid size={18} className="menu-icon-sub" />
                        <span>Core Box Master</span>
                      </div>
                    </button>
                  )}
                  {hasPermission('can_access_pattern_master') && (
                    <button
                      className={`sub-menu-item ${isActive('/settings/pattern-master') ? 'active' : ''}`}
                      onClick={() => handleNavigation('/settings/pattern-master')}
                    >
                      <div className="menu-item-left">
                        <Cpu size={18} className="menu-icon-sub" />
                        <span>Pattern Master</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header glass-panel">
          <button className="menu-toggle-btn" onClick={() => setIsMobileOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e0e0e0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b35, #ffa500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                {(sessionStorage.getItem('username') || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="user-name-text" style={{ fontWeight: '500', letterSpacing: '0.5px' }}>{sessionStorage.getItem('username') || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-btn-text">Logout</span>
              <LogOut size={18} className="logout-icon" />
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
