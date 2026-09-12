import { useState, useMemo } from 'react';
import { Users, Trophy, Target, AlertCircle, ChevronRight, ArrowLeft, Search, ArrowUpDown } from 'lucide-react';
import { getInitials, getScoreClass, getRankClass, ScoreBadge, ProgressBar } from '../components/helpers';
import CandidateDetail from '../components/CandidateDetail';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const DONUT_COLORS = { high: '#10B981', mid: '#F59E0B', low: '#EF4444' };

function MiniDonut({ score }) {
  const cls = getScoreClass(score);
  const color = DONUT_COLORS[cls];
  return (
    <ResponsiveContainer width={48} height={48}>
      <PieChart>
        <Pie data={[{ value: score }, { value: 100 - score }]} cx="50%" cy="50%" innerRadius={15} outerRadius={22} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
          <Cell fill={color} />
          <Cell fill="#F1F5F9" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function ResultsPage({ data, fromPage, onBack }) {
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filterTier, setFilter]   = useState('all'); // 'all' | 'high' | 'mid' | 'low'
  const [sortBy, setSortBy]       = useState('score_desc'); // 'score_desc' | 'score_asc' | 'name'

  const { jd_title, candidates = [] } = data;
  const top = candidates[0];
  const avgScore = candidates.length ? (candidates.reduce((s, c) => s + c.overall_score, 0) / candidates.length).toFixed(1) : 0;
  const highCount = candidates.filter(c => c.overall_score >= 70).length;
  const midCount  = candidates.filter(c => c.overall_score >= 45 && c.overall_score < 70).length;
  const lowCount  = candidates.filter(c => c.overall_score < 45).length;

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(c => {
        if (filterTier === 'high' && c.overall_score < 70) return false;
        if (filterTier === 'mid'  && (c.overall_score < 45 || c.overall_score >= 70)) return false;
        if (filterTier === 'low'  && c.overall_score >= 45) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const nameMatch = c.candidate_name?.toLowerCase().includes(q);
          const skillMatch = c.matched_skills?.some(s => s.toLowerCase().includes(q));
          if (!nameMatch && !skillMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score_desc') return b.overall_score - a.overall_score;
        if (sortBy === 'score_asc') return a.overall_score - b.overall_score;
        if (sortBy === 'name') return a.candidate_name.localeCompare(b.candidate_name);
        return 0;
      });
  }, [candidates, filterTier, search, sortBy]);

  return (
    <div className="page">

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button id="back-btn" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Results — {jd_title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} analyzed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-strip fade-up">
        <div className="stat-card">
          <div className="stat-icon purple"><Users size={20} /></div>
          <div>
            <div className="stat-value">{candidates.length}</div>
            <div className="stat-label">Total Candidates</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Trophy size={20} /></div>
          <div>
            <div className="stat-value">{top?.overall_score ? top.overall_score.toFixed(1) : 0}</div>
            <div className="stat-label">Highest Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Target size={20} /></div>
          <div>
            <div className="stat-value">{avgScore}</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><AlertCircle size={20} /></div>
          <div>
            <div className="stat-value">{highCount}</div>
            <div className="stat-label">Strong Matches (≥70)</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card fade-up" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search candidate or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn btn-sm ${filterTier === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>
              All ({candidates.length})
            </button>
            <button className={`btn btn-sm ${filterTier === 'high' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('high')} style={filterTier === 'high' ? { background: 'var(--success)' } : {}}>
              High ({highCount})
            </button>
            <button className={`btn btn-sm ${filterTier === 'mid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('mid')} style={filterTier === 'mid' ? { background: 'var(--warning)' } : {}}>
              Mid ({midCount})
            </button>
            <button className={`btn btn-sm ${filterTier === 'low' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('low')} style={filterTier === 'low' ? { background: 'var(--danger)' } : {}}>
              Low ({lowCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              className="form-input"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ height: 38, fontSize: 13, padding: '0 8px', width: 'auto' }}
            >
              <option value="score_desc">Score: High → Low</option>
              <option value="score_asc">Score: Low → High</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

        </div>

        {/* Results Counter indicator */}
        {(search || filterTier !== 'all') && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </div>
        )}
      </div>

      {/* Candidate Grid Container (3 per row permanent) */}
      {filteredCandidates.length === 0 ? (
        <div className="card empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-title">No candidates match your search</div>
          <div className="empty-sub">Try changing your search query or score filters above.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {filteredCandidates.map((c, i) => {
            const displayName = c.candidate_name || c.name || (c.filename ? c.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ") : `Candidate ${i+1}`);
            return (
              <div
                key={displayName + i}
                id={`candidate-card-${i}`}
                className={`candidate-card ${getRankClass(i)} fade-up`}
                style={{
                  animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  padding: '16px'
                }}
                onClick={() => setSelected({ ...c, candidate_name: displayName })}
              >
                <div>
                  {/* Header */}
                  <div className="candidate-header" style={{ marginBottom: 10 }}>
                    <div className="candidate-meta" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>#{i+1}</span>
                        <div className="candidate-avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                          {getInitials(displayName)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="candidate-name" style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Score: <strong style={{ color: 'var(--text)' }}>{c.overall_score.toFixed(1)} / 100</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <ScoreBadge score={c.overall_score} />
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>

                  {/* Breakdown Progress Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 4px' }}>
                    {c.breakdown && Object.entries(c.breakdown).map(([key, val]) => {
                      const labels = { skill_match: 'Skills', semantic_similarity: 'Semantic', experience: 'Experience', education: 'Education' };
                      const colors = { skill_match: 'fill-success', semantic_similarity: 'fill-primary', experience: 'fill-blue', education: 'fill-warning' };
                      return (
                        <ProgressBar
                          key={key}
                          label={labels[key] || key}
                          score={val.score}
                          max={val.max}
                          colorClass={colors[key] || 'fill-primary'}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Matched & Missing Skills at the end */}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* Matched skills */}
                  {c.matched_skills?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {c.matched_skills.slice(0, 4).map(s => (
                        <span key={s} className="tag tag-matched" style={{ padding: '1px 6px', fontSize: 10 }}>{s}</span>
                      ))}
                      {c.matched_skills.length > 4 && (
                        <span className="tag tag-neutral" style={{ padding: '1px 6px', fontSize: 10 }}>+{c.matched_skills.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Missing skills */}
                  {c.missing_skills?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}>Missing:</span>
                      {c.missing_skills.slice(0, 3).map(s => (
                        <span key={s} className="tag tag-missing" style={{ padding: '1px 6px', fontSize: 10 }}>+ {s}</span>
                      ))}
                      {c.missing_skills.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{c.missing_skills.length - 3}</span>}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {selected && <CandidateDetail candidate={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}


