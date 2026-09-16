import { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, FileSearch, Upload, BrainCircuit, BarChart2, FileText, Sparkles } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',       page: 'dashboard' },
  { icon: Upload,          label: 'New Analysis',    page: 'analyze'   },
  { icon: FileSearch,      label: 'Past Sessions',   page: 'sessions'  },
  { icon: BrainCircuit,    label: 'AI Insights',     page: 'insights'  },
];

export default function Sidebar({ currentPage, onNavigate }) {
  const [stats, setStats] = useState({ resumes_analyzed: 0, avg_match_score: 0, active_jds: 0 });

  useEffect(() => {
    fetchStats();
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/api/stats`);
      setStats(data);
    } catch (e) {
      // fallback silent
    }
  };

  return (
    <aside className="sidebar">
      <div
        className="sidebar-logo"
        onClick={() => onNavigate('dashboard')}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ flexShrink: 0, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo.png" alt="CVera Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="logo-text">CVera</span>
          <span className="logo-sub">Resume Analyzer</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Menu</span>
        {navItems.map(({ icon: Icon, label, page }) => (
          <button
            key={page}
            className={`nav-item` + (currentPage === page ? ' active' : '')}
            onClick={() => onNavigate(page)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9, marginBottom: 10 }}>
            <BarChart2 size={13} /> Live Stats
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.85 }}>Resumes analyzed:</span>
              <strong style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                {stats.resumes_analyzed}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.85 }}>Avg. match score:</span>
              <strong style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                {stats.avg_match_score}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.85 }}>Active job description:</span>
              <strong style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4 }}>
                {stats.active_jds}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
