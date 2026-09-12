import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Users, Trophy, ChevronRight, FolderOpen } from 'lucide-react';
import { ScoreBadge } from '../components/helpers';

const API = 'http://localhost:8000';

export default function SessionsPage({ onLoadSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/api/sessions`);
      setSessions(data);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      if (e.response?.status === 404) {
        setError('Endpoint /api/sessions not found on backend. Please restart your uvicorn backend server!');
      } else {
        setError(`Could not load past sessions (${msg}). Is the backend running?`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (jdId) => {
    try {
      const { data } = await axios.get(`${API}/api/sessions/${jdId}/candidates`);
      onLoadSession(data);
    } catch (e) {
      alert('Failed to load session details.');
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading past analysis sessions...</p>
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

      {sessions.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><FolderOpen size={36} color="var(--primary)" /></div>
          <div className="empty-title">No past sessions found</div>
          <div className="empty-sub">Run a new analysis to save job descriptions and candidate rankings here.</div>
        </div>
      ) : (
        <div className="grid-1" style={{ gap: 14 }}>
          {sessions.map(s => (
            <div
              key={s.id}
              className="card candidate-card fade-up"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => handleOpenSession(s.id)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
                  {s.title}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} /> {s.created_at || 'Recent'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={14} /> {s.candidate_count} candidate{s.candidate_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Top Score</div>
                  <ScoreBadge score={s.top_score} />
                </div>
                <ChevronRight size={20} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
