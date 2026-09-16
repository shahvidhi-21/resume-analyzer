import { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, AlertTriangle, CheckCircle2, HelpCircle, BrainCircuit, RefreshCw, ChevronDown } from 'lucide-react';

const API = 'http://localhost:8000';

export default function InsightsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedJdId, setSelectedJdId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Fetch all sessions from all job titles on mount
  useEffect(() => {
    setLoadingSessions(true);
    axios.get(`${API}/api/job-titles`)
      .then(async ({ data: jobTitles }) => {
        // For each job title, fetch its sessions and flatten them all
        const allSessions = [];
        for (const jt of jobTitles) {
          try {
            const { data } = await axios.get(`${API}/api/job-titles/${jt.id}/sessions`);
            for (const s of (data.sessions || [])) {
              allSessions.push({ ...s, job_title: jt.title });
            }
          } catch { /* skip failed titles */ }
        }
        setSessions(allSessions);
        if (allSessions.length > 0) {
          setSelectedJdId(allSessions[0].id);
        }
        setLoadingSessions(false);
      })
      .catch(() => setLoadingSessions(false));
  }, []);

  // Fetch candidates when a session is selected
  useEffect(() => {
    if (!selectedJdId) return;
    setLoadingCandidates(true);
    axios.get(`${API}/api/sessions/${selectedJdId}/candidates`)
      .then(({ data }) => {
        setCandidates(data.candidates || []);
        setLoadingCandidates(false);
      })
      .catch(() => setLoadingCandidates(false));
  }, [selectedJdId]);

  const withInsights = candidates.filter(c => c.llm_insights);

  if (loadingSessions) {
    return (
      <div className="page">
        <div className="empty-state">
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
          <div className="empty-sub" style={{ marginTop: 12 }}>Loading sessions...</div>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-title">AI Insights</div>
          <div className="empty-sub">Run an analysis first to see AI-generated interview insights here.</div>
        </div>
      </div>
    );
  }

  const selectedSession = sessions.find(s => s.id === selectedJdId);

  return (
    <div className="page" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Session Picker */}
        <div style={{
          marginBottom: 28,
          background: 'linear-gradient(90deg,#7c3aed,#a78bfa,#60a5fa)',
          borderRadius: 14,
          boxShadow: '0 4px 24px rgba(124,58,237,0.18)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Icon + label inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BrainCircuit size={17} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.7px', whiteSpace: 'nowrap' }}>
                Viewing Session
              </span>
            </div>

            {/* Dropdown */}
            <div style={{ position: 'relative', flex: 1 }}>
              <select
                value={selectedJdId || ''}
                onChange={e => setSelectedJdId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#3b1f8c', color: '#fff' }}>
                    {s.job_title || s.title} — {s.created_at?.split(' ')[0]}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#fff' }} />
            </div>

            {/* Candidate count */}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 60 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1 }}>{candidates.filter(c => c.llm_insights).length}</div>
              <div style={{ marginTop: 3 }}>with insights</div>
            </div>
          </div>
        </div>



        {/* Loading */}
        {loadingCandidates && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* No insights in this session */}
        {!loadingCandidates && withInsights.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-icon">🤔</div>
            <div className="empty-title">No AI Insights</div>
            <div className="empty-sub">This session has no AI insights. Try running a new analysis with the Gemini API key configured.</div>
          </div>
        )}

        {/* Candidate Cards */}
        {!loadingCandidates && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {withInsights.map((c, idx) => {
              const iq = c.llm_insights.interview_questions;
              const cq = c.llm_insights.claim_questions || [];
              return (
                <div key={idx} className="card" style={{ padding: 24, borderRadius: 12 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: ['linear-gradient(135deg,#7c3aed,#a78bfa)', 'linear-gradient(135deg,#2563eb,#60a5fa)', 'linear-gradient(135deg,#059669,#34d399)', 'linear-gradient(135deg,#d97706,#fbbf24)', 'linear-gradient(135deg,#dc2626,#f87171)'][idx % 5],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0
                    }}>
                      {(c.candidate_name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{c.candidate_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Score: <strong style={{ color: 'var(--primary)' }}>{c.overall_score}%</strong>
                        &nbsp;·&nbsp;{c.matched_skills?.length || 0} matched · {c.missing_skills?.length || 0} missing
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <BrainCircuit size={20} color="var(--primary)" opacity={0.5} />
                    </div>
                  </div>

                  {/* Claim Questions */}
                  {cq.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={12} /> Claim Verification
                      </div>
                      {cq.map((item, i) => (
                        <div key={i} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--warning)', marginBottom: 8 }}>
                          <div style={{ fontSize: 11, opacity: 0.6, fontStyle: 'italic', marginBottom: 4 }}>Claim: "{item.claim}"</div>
                          <div style={{ fontSize: 13 }}>{item.question}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interview Questions */}
                  {iq && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HelpCircle size={12} /> Interview Questions
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {iq.technical && (
                          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--primary)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', gap: 5, alignItems: 'center' }}><BookOpen size={10} /> Technical</div>
                            <div style={{ fontSize: 13 }}>{iq.technical}</div>
                          </div>
                        )}
                        {iq.project && (
                          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--success)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', gap: 5, alignItems: 'center' }}><BookOpen size={10} /> Project</div>
                            <div style={{ fontSize: 13 }}>{iq.project}</div>
                          </div>
                        )}
                        {iq.skill_gap && (
                          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--danger)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', gap: 5, alignItems: 'center' }}><AlertTriangle size={10} /> Skill Gap</div>
                            <div style={{ fontSize: 13 }}>{iq.skill_gap}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
