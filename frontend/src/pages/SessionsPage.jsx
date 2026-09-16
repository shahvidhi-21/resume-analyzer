import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar, Users, ChevronRight, ChevronDown,
  FolderOpen, Search, ArrowUpDown, Layers,
  Edit2, Check, X, Plus
} from 'lucide-react';

const API = 'http://localhost:8000';

const TITLE_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#5a50cb',
  '#DB2777', '#0891B2', '#6D28D9', '#0D9488',
];
const CARD_GRADIENTS = [
  '#F5F3FF', '#EFF6FF', '#ECFDF5', '#EEF2FF',
  '#FDF2F8', '#ECFEFF', '#EDE9FE', '#F0FDFA',
];
const CARD_BORDERS = [
  '#DDD6FE', '#BFDBFE', '#A7F3D0', '#C7D2FE',
  '#FBCFE8', '#A5F3FC', '#C4B5FD', '#99F6E4',
];

function getScoreColor(score) {
  if (!score) return '#94a3b8';
  if (score >= 70) return '#10B981';
  if (score >= 45) return '#F59E0B';
  return '#EF4444';
}

function ScoreDot({ score }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 48, height: 24, borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: getScoreColor(score) + '20', color: getScoreColor(score), padding: '0 8px'
    }}>
      {score ? `${Math.round(score)}%` : '—'}
    </span>
  );
}

// ─── Session row inside expanded job title ─────────────────────────────────
function SessionRow({ session, onOpen, onEdit, titleColor }) {
  return (
    <div
      onClick={() => onOpen(session.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)',
        marginBottom: 6, transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
    >
      <span style={{ fontSize: 12, color: '#64748b', flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar size={11} />
        {session.created_at
          ? new Date(session.created_at.replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Recent'}
      </span>
      <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Users size={11} />
        {session.candidate_count} candidate{session.candidate_count !== 1 ? 's' : ''}
      </span>
      <ScoreDot score={session.top_score} />
      
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(session); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6, border: 'none',
          background: 'rgba(0,0,0,0.04)', color: '#64748b',
          cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
          marginLeft: 8
        }}
        title="Edit Session"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#334155'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#64748b'; }}
      >
        <Edit2 size={14} />
      </button>

      <ChevronRight size={14} color="#94a3b8" />
    </div>
  );
}

// ─── Job Title card (collapsible) ─────────────────────────────────────────
function JobTitleCard({ jt, onOpenSession, onNewSession, onEditSession }) {
  const [expanded, setExpanded]   = useState(false);
  const [sessions, setSessions]   = useState(null);
  const [loadingSes, setLoadingSes] = useState(false);

  const idx         = (jt.id || 0) % TITLE_COLORS.length;
  const titleColor  = TITLE_COLORS[idx];
  const gradient    = CARD_GRADIENTS[idx];
  const border      = CARD_BORDERS[idx];

  const toggle = async () => {
    if (!expanded && sessions === null) {
      setLoadingSes(true);
      try {
        const { data } = await axios.get(`${API}/api/job-titles/${jt.id}/sessions`);
        setSessions(data.sessions);
      } catch { setSessions([]); }
      finally { setLoadingSes(false); }
    }
    setExpanded(v => !v);
  };

  return (
    <div className="card fade-up" style={{ background: gradient, border: `1.5px solid ${border}`, marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      {/* Header row */}
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: titleColor + '18', border: `1.5px solid ${titleColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Layers size={18} color={titleColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: titleColor, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {jt.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              {jt.created_at
                ? new Date(jt.created_at.replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={11} />
              {jt.session_count} session{jt.session_count !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} />
              {jt.candidate_count} candidate{jt.candidate_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <ScoreDot score={jt.top_score} />
        {expanded
          ? <ChevronDown size={18} color="#94a3b8" />
          : <ChevronRight size={18} color="#94a3b8" />
        }
      </div>

      {/* Expanded sessions list */}
      {expanded && (
        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${border}` }}>
          <div style={{ paddingTop: 12 }}>
            {loadingSes ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '8px 0' }}>Loading sessions…</div>
            ) : sessions && sessions.length > 0 ? (
              sessions.map(s => (
                <SessionRow key={s.id} session={{...s, title: jt.title}} titleColor={titleColor} onOpen={onOpenSession} onEdit={onEditSession} />
              ))
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>No sessions yet.</div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onNewSession(jt.title); }}
              style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7, border: `1.5px dashed ${titleColor}66`,
                background: 'transparent', color: titleColor, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = titleColor + '10'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={13} /> Add new session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function SessionsPage({ onLoadSession, onNewSession, onEditSession }) {
  const [jobTitles, setJobTitles] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchJobTitles(); }, []);

  const fetchJobTitles = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/api/job-titles`);
      setJobTitles(data);
    } catch (e) {
      setError('Could not load sessions. Is the backend running?');
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

  const filtered = useMemo(() =>
    search.trim()
      ? jobTitles.filter(jt => jt.title.toLowerCase().includes(search.toLowerCase()))
      : jobTitles,
    [jobTitles, search]
  );

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading sessions…</p>
      </div>
    );
  }

  return (
    <div className="page fade-up">
      {error && (
        <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Search bar */}
      {jobTitles.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              id="session-search"
              placeholder="Search job title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 10, boxSizing: 'border-box', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {jobTitles.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><FolderOpen size={36} color="var(--primary)" /></div>
          <div className="empty-title">No past sessions found</div>
          <div className="empty-sub">Run a new analysis to see job titles and sessions here.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><Search size={32} color="var(--text-muted)" /></div>
          <div className="empty-title">No job titles match your search</div>
          <div className="empty-sub">Try a different keyword.</div>
        </div>
      ) : (
        <div>
          {filtered.map(jt => (
            <JobTitleCard
              key={jt.id}
              jt={jt}
              onOpenSession={handleOpenSession}
              onNewSession={onNewSession}
              onEditSession={onEditSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
