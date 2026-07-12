import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Package, FileText, ChevronRight, Activity, TrendingUp, Cpu } from 'lucide-react';
import api from '../../api';

interface StatCardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, icon, description, onClick, colorClass }) => (
  <div className={`glass-panel dashboard-stat-card ${colorClass}`} onClick={onClick}>
    <div className="stat-card-glow"></div>
    <div className="stat-card-header">
      <span className="stat-title">{title}</span>
      <div className="stat-icon-wrapper">{icon}</div>
    </div>
    <div className="stat-value">{count}</div>
    <div className="stat-footer">
      <span className="stat-desc">{description}</span>
      <span className="stat-action">
        Manage <ChevronRight size={14} className="action-chevron" />
      </span>
    </div>
  </div>
);

const WelcomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    suppliers: '...',
    materials: '...',
    orders: '...',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [supRes, matRes, poRes] = await Promise.all([
          api.get('/api/inventory/suppliers/?page_size=1').catch(() => ({ data: { count: 0 } })),
          api.get('/api/inventory/raw-materials/?page_size=1').catch(() => ({ data: { count: 0 } })),
          api.get('/api/purchases/purchase-inwards/?page_size=1').catch(() => ({ data: { count: 0 } })),
        ]);

        setStats({
          suppliers: supRes.data.count ?? 0,
          materials: matRes.data.count ?? 0,
          orders: poRes.data.count ?? 0,
        });
      } catch (err) {
        console.error("Failed to load statistics", err);
      }
    };
    fetchStats();
  }, []);

  const username = sessionStorage.getItem('username') || 'Administrator';
  const clientName = sessionStorage.getItem('client_name') || 'Foundry System';

  return (
    <div className="welcome-dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner glass-panel">
        <div className="banner-glow-effect"></div>
        <div className="banner-content">
          <div className="banner-badge">
            <Cpu size={14} className="badge-pulse-icon" />
            <span>Isolated Client Environment Active</span>
          </div>
          <h1 className="banner-title">Welcome Back, {username}!</h1>
            You are logged into <strong className="highlight-text">{clientName}</strong>. Monitor castings, manage suppliers, configure raw materials, and draft purchase inwards.
        </div>
        <div className="banner-stats">
          <div className="banner-stat-bubble">
            <Activity size={16} color="var(--color-molten-yellow)" />
            <div>
              <span className="bubble-label">STATUS</span>
              <span className="bubble-val">ONLINE</span>
            </div>
          </div>
          <div className="banner-stat-bubble">
            <TrendingUp size={16} color="#22c55e" />
            <div>
              <span className="bubble-label">HEALTH</span>
              <span className="bubble-val">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Statistics Section */}
      <div className="dashboard-grid-header">
        <h2>Operations Control</h2>
        <p>Operational directories configured for your company infrastructure.</p>
      </div>

      <div className="dashboard-stats-grid">
        <StatCard
          title="Supplier Directory"
          count={stats.suppliers}
          icon={<Building2 size={24} />}
          description="Approved logistics and steel vendors"
          onClick={() => navigate('/settings/supplier-master')}
          colorClass="orange-glow"
        />
        <StatCard
          title="Raw Material Codes"
          count={stats.materials}
          icon={<Package size={24} />}
          description="Casting scrap, alloy, and chemical additives"
          onClick={() => navigate('/settings/raw-material-master')}
          colorClass="yellow-glow"
        />
        <StatCard
          title="Purchase Inwards"
          count={stats.orders}
          icon={<FileText size={24} />}
          description="Material receipt records and active vendor drafts"
          onClick={() => navigate('/purchases/purchase-inward')}
          colorClass="red-glow"
        />
      </div>
    </div>
  );
};

export default WelcomeDashboard;
