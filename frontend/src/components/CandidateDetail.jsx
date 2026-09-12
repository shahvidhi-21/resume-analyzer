import { X, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getInitials, getScoreClass, ProgressBar } from './helpers';

const DONUT_COLORS = { high: '#10B981', mid: '#F59E0B', low: '#EF4444' };

export default function CandidateDetail({ candidate, onClose }) {
  if (!candidate) return null;

  const { overall_score, breakdown, matched_skills, missing_skills, jd_required_skills, llm_insights } = candidate;
  const displayName = candidate.candidate_name || candidate.name || 'Candidate';
  const scoreClass = getScoreClass(overall_score);
  const color = DONUT_COLORS[scoreClass];

  const donutData = [
    { value: overall_score },
    { value: 100 - overall_score },
  ];

  const breakdownRows = [
    { label: 'Skill Match',         key: 'skill_match',        color: 'fill-success' },
    { label: 'Semantic Similarity', key: 'semantic_similarity', color: 'fill-primary' },
    { label: 'Experience',          key: 'experience',          color: 'fill-blue'    },
    { label: 'Education',           key: 'education',           color: 'fill-warning' },
  ];

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="candidate-avatar" style={{ width: 44, height: 44, fontSize: 17 }}>
              {getInitials(displayName)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Detailed Candidate Breakdown</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="detail-body">

          {/* Top Section: Left Donut Chart + Right Score Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20, alignItems: 'center', marginBottom: 20, background: 'var(--bg)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            
            {/* Left Column: Donut + ATS Score in middle of donut */}
            <div style={{ textAlign: 'center' }}>
              <p className="detail-section-title" style={{ marginBottom: 2 }}>Overall Score</p>
              <div style={{ position: 'relative', width: 140, height: 130, margin: '0 auto' }}>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={44} outerRadius={58} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                      <Cell fill={color} />
                      <Cell fill="#E2E8F0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{overall_score.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>/ 100</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>ATS Score</div>
            </div>

            {/* Right Column: Score Breakdown Progress Bars */}
            <div>
              <p className="detail-section-title" style={{ marginBottom: 10 }}>Score Breakdown</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {breakdownRows.map(({ label, key, color: cls }) => (
                  breakdown && breakdown[key] && (
                    <ProgressBar
                      key={key}
                      label={label}
                      score={breakdown[key].score}
                      max={breakdown[key].max}
                      colorClass={cls}
                    />
                  )
                ))}
              </div>
            </div>

          </div>

          <div className="divider" />

          {/* Matched Skills */}
          {matched_skills?.length > 0 && (
            <div className="detail-section">
              <p className="detail-section-title">✅ Matched Skills ({matched_skills.length})</p>
              <div className="tags-wrap">
                {matched_skills.map(s => (
                  <span key={s} className="tag tag-matched">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {missing_skills?.length > 0 && (
            <div className="detail-section">
              <p className="detail-section-title">❌ Missing High-Value Skills ({missing_skills.length})</p>
              <div className="tags-wrap">
                {missing_skills.map(s => (
                  <span key={s} className="tag tag-missing">+ {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* JD Required Skills */}
          {jd_required_skills?.length > 0 && (
            <div className="detail-section">
              <p className="detail-section-title">📋 JD Required Skills</p>
              <div className="tags-wrap">
                {jd_required_skills.map(s => (
                  <span key={s} className="tag">
                    {matched_skills?.includes(s) ? '✓' : '+'} {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LLM Insights */}
          {llm_insights && (
            <>
              <div className="divider" />
              <div className="detail-section">
                <p className="detail-section-title">🤖 AI Interview Insights</p>

                {llm_insights.strengths?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={13} /> Strengths
                    </div>
                    {llm_insights.strengths.map((s, i) => (
                      <div key={i} className="insight-item strength"><CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />{s}</div>
                    ))}
                  </div>
                )}

                {llm_insights.weaknesses?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingDown size={13} /> Gaps / Weaknesses
                    </div>
                    {llm_insights.weaknesses.map((w, i) => (
                      <div key={i} className="insight-item weakness"><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{w}</div>
                    ))}
                  </div>
                )}

                {llm_insights.interview_questions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={13} /> Suggested Interview Questions
                    </div>
                    {llm_insights.interview_questions.map((q, i) => (
                      <div key={i} className="insight-item question"><BookOpen size={14} style={{ flexShrink: 0, marginTop: 1 }} />{q}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!llm_insights && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>
              AI insights not available (LLM not configured)
            </div>
          )}

        </div>
      </div>
    </>
  );
}
