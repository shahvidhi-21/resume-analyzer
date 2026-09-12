import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar, Users, Trophy, ChevronRight,
  FolderOpen, Search, ArrowUpDown, Briefcase,
  TrendingUp, Star
} from 'lucide-react';
import { ScoreBadge, getScoreClass } from '../components/helpers';

const API = 'http://localhost:8000';

function getScoreColor(score) {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 70) return '#10B981';
  if (score >= 45) return '#F59E0B';
  return '#EF4444';
}

// On-theme title colours — rotated per card based on session id
const TITLE_COLORS = [
  '#7C3AED', // violet
  '#2563EB', // blue
  '#059669', // emerald
  '#4338CA', // indigo
  '#DB2777', // pink
  '#0891B2', // cyan
  '#6D28D9', // deep violet
  '#0D9488', // teal
];

// Matching solid tint backgrounds
const CARD_GRADIENTS = [
  '#F5F3FF', // violet
  '#EFF6FF', // blue
  '#ECFDF5', // emerald
  '#EEF2FF', // indigo
  '#FDF2F8', // pink
  '#ECFEFF', // cyan
  '#EDE9FE', // deep violet
  '#F0FDFA', // teal
];

// Matching subtle border tints
const CARD_BORDERS = [
  '#DDD6FE', '#BFDBFE', '#A7F3D0', '#C7D2FE',
  '#FBCFE8', '#A5F3FC', '#C4B5FD', '#99F6E4',
];

function SessionCard({ s, onOpen }) {
  const idx = (s.id || 0) % TITLE_COLORS.length;
  const titleColor = TITLE_COLORS[idx];
  const gradient   = CARD_GRADIENTS[idx];
  const border     = CARD_BORDERS[idx];

  return (
    <div
      className="candidate-card card fade-up"
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: gradient,
        border: `1.5px solid ${border}`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${border}66`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
      onClick={() => onOpen(s.id)}
    >


      {/* Role + date + candidate count */}
      <div style={{ flex: 1, minWidth: 0, marginTop: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: titleColor, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} />
            {s.created_at
              ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Recent'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} />
            {s.candidate_count} candidate{s.candidate_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 12 }} />
    </div>
  );
}

export default function SessionsPage({ onLoadSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterTier, setFilter] = useState('all');
  const [sortBy, setSortBy]     = useState('date_desc');

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get(`${API}/api/sessions`);
      setSessions(data);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      setError(`Could not load past sessions (${msg}). Is the backend running?`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (jdId) => {
    try {
      const { data } = await axios.get(`${API}/api/sessions/${jdId}/candidates`);
      onLoadSession(data);
    } catch {
      alert('Failed to load session details.');
    }
  };

  /* derived stats */
  const totalCandidates = sessions.reduce((s, x) => s + (x.candidate_count || 0), 0);
  const avgTopScore = sessions.length
    ? (sessions.reduce((s, x) => s + (x.top_score || 0), 0) / sessions.length).toFixed(1)
    : '—';
  const highSessions = sessions.filter(s => (s.top_score || 0) >= 70).length;

  /* filtered + sorted */
  const displayed = useMemo(() => {
    return sessions
      .filter(s => {
        if (filterTier === 'high' && (s.top_score || 0) <  70) return false;
        if (filterTier === 'mid'  && ((s.top_score || 0) < 45 || (s.top_score || 0) >= 70)) return false;
        if (filterTier === 'low'  && (s.top_score || 0) >= 45) return false;
        if (search.trim() && !s.title?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc')  return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'score_desc') return (b.top_score || 0) - (a.top_score || 0);
        if (sortBy === 'candidates') return (b.candidate_count || 0) - (a.candidate_count || 0);
        return 0;
      });
  }, [sessions, filterTier, search, sortBy]);

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading past sessions…</p>
      </div>
    );
  }

  return (
    <div className="page fade-up">

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-light)', color: '#991B1B', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}


      {/* Filters bar — right aligned */}
      {sessions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 20 }}>

          {/* Search */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              id="session-search"
              placeholder="Search job title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 10, boxSizing: 'border-box', borderRadius: 8, border: '1.5px solid var(--border)', background: '#FFFFFF', color: 'var(--text-primary)', fontSize: 13, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <ArrowUpDown size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              id="session-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ height: 36, paddingLeft: 30, paddingRight: 12, fontSize: 13, cursor: 'pointer', borderRadius: 8, border: '1.5px solid var(--border)', background: '#FFFFFF', color: 'var(--text-primary)', appearance: 'none', WebkitAppearance: 'none', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            >
              <option value="date_desc">Newest first</option>
              <option value="candidates">Most candidates</option>
            </select>
          </div>

        </div>
      )}


      {/* Content */}
      {sessions.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><FolderOpen size={36} color="var(--primary)" /></div>
          <div className="empty-title">No past sessions found</div>
          <div className="empty-sub">Run a new analysis to save job descriptions and candidate rankings here.</div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><Search size={32} color="var(--text-muted)" /></div>
          <div className="empty-title">No sessions match your filters</div>
          <div className="empty-sub">Try adjusting the search or score tier filter.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {displayed.map(s => (
            <SessionCard key={s.id} s={s} onOpen={handleOpenSession} />
          ))}
        </div>
      )}

    </div>
  );
}


