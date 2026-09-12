export function getScoreClass(score) {
  if (score >= 70) return 'high';
  if (score >= 45) return 'mid';
  return 'low';
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export function getRankClass(index) {
  if (index === 0) return 'rank-1';
  if (index === 1) return 'rank-2';
  if (index === 2) return 'rank-3';
  return 'rank-n';
}

export function ProgressBar({ label, score, max, colorClass }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="progress-row">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{score}/{max}</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBadge({ score }) {
  return (
    <span className={`score-badge ${getScoreClass(score)}`}>
      {score?.toFixed ? score.toFixed(1) : score}
    </span>
  );
}
