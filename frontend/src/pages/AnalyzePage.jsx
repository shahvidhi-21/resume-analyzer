import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, FileText, X, Briefcase, Send, AlertCircle, ChevronDown, ArrowLeft } from 'lucide-react';

const API = 'http://localhost:8000';

export default function AnalyzePage({ onResults, prefilledTitle = '', editSessionData = null, onBack = null }) {
  const [jdTitle, setJdTitle]           = useState(prefilledTitle);
  const [jdText, setJdText]             = useState('');
  const [jdFile, setJdFile]             = useState(null);
  const [resumes, setResumes]           = useState([]);
  const [existingCandidates, setExistingCandidates] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [showSuggestions, setShow]      = useState(false);
  const titleRef = useRef(null);
  
  const isEditMode = !!editSessionData;

  useEffect(() => {
    if (isEditMode) {
      setJdTitle(editSessionData.title);
      setLoading(true);
      axios.get(`${API}/api/sessions/${editSessionData.id}/candidates`)
        .then(({ data }) => {
          setJdText(data.jd_text || '');
          setExistingCandidates(data.candidates || []);
        })
        .catch(() => setError('Failed to load session details.'))
        .finally(() => setLoading(false));
    } else {
      setJdTitle(prefilledTitle);
      setJdText('');
      setExistingCandidates([]);
    }
  }, [editSessionData, prefilledTitle]);



  useEffect(() => {
    if (!jdTitle.trim() || isEditMode) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API}/api/job-titles/search?q=${encodeURIComponent(jdTitle)}`);
        setSuggestions(data);
        setShow(data.length > 0);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [jdTitle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (titleRef.current && !titleRef.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onDropJD = useCallback(files => {
    if (files[0]) setJdFile(files[0]);
  }, []);

  const onDropResumes = useCallback(files => {
    setResumes(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !names.has(f.name))];
    });
  }, []);

  const { getRootProps: getJDRootProps, getInputProps: getJDInputProps, isDragActive: jdDrag } = useDropzone({ onDrop: onDropJD, multiple: false, accept: { 'application/pdf': [], 'text/plain': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] } });
  const { getRootProps: getResRootProps, getInputProps: getResInputProps, isDragActive: resDrag } = useDropzone({ onDrop: onDropResumes, multiple: true, accept: { 'application/pdf': [], 'text/plain': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] } });

  const removeResume = (name) => setResumes(r => r.filter(f => f.name !== name));

  const removeExistingCandidate = async (candidateId) => {
    if (!window.confirm("Are you sure you want to remove this candidate?")) return;
    try {
      await axios.delete(`${API}/api/sessions/${editSessionData.id}/candidates/${candidateId}`);
      setExistingCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (e) {
      alert("Failed to delete candidate.");
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!jdTitle.trim()) return setError('Please enter a Job Title.');
    if (!jdText.trim() && !jdFile) return setError('Provide a JD file or paste the JD text.');
    if (!isEditMode && resumes.length === 0) return setError('Upload at least one resume.');

    setLoading(true);
    try {
      const form = new FormData();
      form.append('jd_title', jdTitle);
      if (jdFile) form.append('jd_file', jdFile);
      else form.append('jd_text', jdText);
      resumes.forEach(f => form.append('resumes', f));

      if (isEditMode) {
        await axios.put(`${API}/api/sessions/${editSessionData.id}`, form);
        // fetch updated session results
        const { data } = await axios.get(`${API}/api/sessions/${editSessionData.id}/candidates`);
        onResults(data);
      } else {
        const { data } = await axios.post(`${API}/api/analyze`, form);
        onResults(data);
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      const status = e.response?.status;
      const msg = e.message;
      if (detail) setError(`Error ${status}: ${detail}`);
      else if (msg.includes('Network Error') || msg.includes('ECONNREFUSED')) setError('Cannot reach backend at port 8000. Make sure uvicorn is running.');
      else setError(`Request failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page fade-up">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Back button in edit mode */}
        {isEditMode && onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: 20, padding: '7px 14px',
              border: '1.5px solid var(--border)', borderRadius: 8,
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={14} /> Back to Past Sessions
          </button>
        )}

        {/* Step 1: JD */}
        <div className="card fade-up-delay-1" style={{ marginBottom: 20 }}>
          <div className="card-title"><Briefcase size={16} color="var(--primary)" /> Step 1 — Job Description</div>

          <label className="form-label">Job Title *</label>
          <div ref={titleRef} style={{ position: 'relative', marginBottom: 16 }}>
            <input
              id="jd-title-input"
              className="form-input"
              placeholder="e.g. Senior Backend Engineer"
              value={jdTitle}
              onChange={e => { setJdTitle(e.target.value); }}
              onFocus={() => !isEditMode && suggestions.length > 0 && setShow(true)}
              autoComplete="off"
              disabled={isEditMode}
            />
            {showSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden' }}>
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setJdTitle(s.title); setShow(false); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronDown size={13} color="var(--primary)" />
                    <span><strong>{s.title}</strong></span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>Existing — new session will be added</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <div>
              <label className="form-label">Upload JD File <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(PDF / DOCX / TXT)</span></label>
              <div {...getJDRootProps()} className={`upload-zone` + (jdDrag ? ' drag-active' : '')} style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <input {...getJDInputProps()} id="jd-file-input" />
                <div className="upload-icon"><Upload size={22} /></div>
                {jdFile ? (
                  <div>
                    <div className="upload-title" style={{ color: 'var(--success)' }}>✓ {jdFile.name}</div>
                    <div className="upload-sub">Click to replace</div>
                  </div>
                ) : (
                  <div>
                    <div className="upload-title">Drag & drop or click</div>
                    <div className="upload-sub">PDF, DOCX, TXT</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Or paste JD text <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(if no file)</span></label>
              <textarea
                id="jd-text-input"
                className="form-textarea"
                style={{ height: 160, resize: 'none' }}
                placeholder="Paste the full job description here..."
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                disabled={!!jdFile}
              />
              {jdFile && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Clear the file above to use text instead.</p>}
            </div>
          </div>
        </div>

        {/* Step 2: Resumes */}
        <div className="card fade-up-delay-2" style={{ marginBottom: 20 }}>
          <div className="card-title"><FileText size={16} color="var(--primary)" /> Step 2 — Upload Resumes</div>

          <div {...getResRootProps()} className={`upload-zone` + (resDrag ? ' drag-active' : '')} style={{ marginBottom: 16 }}>
            <input {...getResInputProps()} id="resumes-input" />
            <div className="upload-icon"><Upload size={22} /></div>
            <div className="upload-title">Drag & drop resumes here</div>
            <div className="upload-sub">PDF, DOCX, TXT — select multiple files at once</div>
          </div>

          {resumes.length > 0 && (
            <div>
              <p className="form-label">{resumes.length} resume{resumes.length > 1 ? 's' : ''} selected:</p>
              {resumes.map(f => (
                <div key={f.name} className="file-chip">
                  <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span className="file-chip-name">{f.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button id={`remove-${f.name}`} className="file-chip-remove" onClick={() => removeResume(f.name)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {isEditMode && existingCandidates.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p className="form-label">{existingCandidates.length} existing candidate{existingCandidates.length > 1 ? 's' : ''} in session:</p>
              {existingCandidates.map(c => (
                <div key={c.id} className="file-chip" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <Briefcase size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                  <span className="file-chip-name" style={{ color: '#334155' }}>{c.candidate_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Score: {c.overall_score}%</span>
                  <button className="file-chip-remove" onClick={() => removeExistingCandidate(c.id)} title="Remove Candidate"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--danger-light)', color: '#991B1B', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {!isEditMode && <button id="clear-btn" className="btn btn-ghost" onClick={() => { setJdTitle(''); setJdText(''); setJdFile(null); setResumes([]); setError(''); }}>Clear All</button>}
          <button id="analyze-btn" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {isEditMode ? 'Saving...' : 'Analyzing...'}</> : <><Send size={16} /> {isEditMode ? 'Save Changes' : 'Run Analysis'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
