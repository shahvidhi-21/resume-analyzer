import { LayoutDashboard, Upload, FileSearch, Zap, ArrowRight } from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  return (
    <div className="page fade-up">

      {/* Hero */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)', border: 'none', marginBottom: 24, padding: '36px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>AI-Powered Recruiting</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>Resume Analyzer</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 480, margin: '0 0 24px' }}>
              Upload job descriptions and resumes. Get instant AI rankings based on skill match, semantic similarity, experience, and education.
            </p>
            <button id="start-analysis-btn" className="btn btn-primary btn-lg" onClick={() => onNavigate('analyze')} style={{ background: '#fff', color: 'var(--primary)' }}>
              <Zap size={18} /> Start New Analysis <ArrowRight size={16} />
            </button>
          </div>
          <div className="animate-float" style={{ fontSize: 160, marginRight: 70, lineHeight: 1 }}>🎯</div>
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>How it works</h3>
        <div className="grid-3">
          {[
            { icon: '📄', title: 'Upload JD', desc: 'Paste or upload your Job Description as PDF, DOCX, or TXT.', color: 'var(--primary-light)', textColor: 'var(--primary)' },
            { icon: '📂', title: 'Upload Resumes', desc: 'Bulk upload multiple candidate resumes in any supported format.', color: 'var(--blue-light)', textColor: 'var(--blue)' },
            { icon: '📊', title: 'Get Rankings', desc: 'AI scores each candidate by skills, semantics, experience & education.', color: 'var(--success-light)', textColor: 'var(--success)' },
          ].map(({ icon, title, desc, color, textColor }) => (
            <div key={title} className="card" style={{ border: `1px solid ${color}`, display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flexShrink: 0, width: 56, height: 56, background: color, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: textColor }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring breakdown info */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">📈 Scoring System</div>
        <div className="grid-2" style={{ gap: 12 }}>
          {[
            { label: 'Skill Match',         max: 50, color: 'fill-success', desc: 'Exact keyword match between JD requirements and candidate skills' },
            { label: 'Semantic Similarity', max: 25, color: 'fill-primary', desc: 'AI embedding similarity — how relevant is the resume overall' },
            { label: 'Experience',          max: 15, color: 'fill-blue',    desc: 'Years of work experience mentioned in the resume' },
            { label: 'Education',           max: 10, color: 'fill-warning', desc: 'Degree level detected (Bachelor, Master, PhD)' },
          ].map(({ label, max, color, desc }) => (
            <div key={label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>max {max} pts</span>
              </div>
              <div className="progress-track" style={{ marginBottom: 8 }}>
                <div className={`progress-fill ${color}`} style={{ width: `${max}%` }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
