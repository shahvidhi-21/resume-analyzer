import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, FileText, X, Briefcase, Send, AlertCircle } from 'lucide-react';

const API = 'http://localhost:8000';

export default function AnalyzePage({ onResults }) {
  const [jdTitle, setJdTitle]   = useState('');
  const [jdText, setJdText]     = useState('');
  const [jdFile, setJdFile]     = useState(null);
  const [resumes, setResumes]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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

  const handleSubmit = async () => {
    setError('');
    if (!jdTitle.trim()) return setError('Please enter a Job Title.');
    if (!jdText.trim() && !jdFile) return setError('Provide a JD file or paste the JD text.');
    if (resumes.length === 0) return setError('Upload at least one resume.');

    setLoading(true);
    try {
      const form = new FormData();
      form.append('jd_title', jdTitle);
      if (jdFile) form.append('jd_file', jdFile);
      else form.append('jd_text', jdText);
      resumes.forEach(f => form.append('resumes', f));

      const { data } = await axios.post(`${API}/api/analyze`, form);
      onResults(data);
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

        {/* Step 1: JD */}
        <div className="card fade-up-delay-1" style={{ marginBottom: 20 }}>
          <div className="card-title"><Briefcase size={16} color="var(--primary)" /> Step 1 — Job Description</div>

          <label className="form-label">Job Title *</label>
          <input
            id="jd-title-input"
            className="form-input"
            placeholder="e.g. Senior Backend Engineer"
            value={jdTitle}
            onChange={e => setJdTitle(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div className="grid-2" style={{ gap: 16 }}>
            <div>
              <label className="form-label">Upload JD File <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(PDF / DOCX / TXT)</span></label>
              <div {...getJDRootProps()} className={`upload-zone` + (jdDrag ? ' drag-active' : '')}>
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
                style={{ minHeight: 140 }}
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
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--danger-light)', color: '#991B1B', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button id="clear-btn" className="btn btn-ghost" onClick={() => { setJdTitle(''); setJdText(''); setJdFile(null); setResumes([]); setError(''); }}>Clear All</button>
          <button id="analyze-btn" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing...</> : <><Send size={16} /> Run Analysis</>}
          </button>
        </div>
      </div>
    </div>
  );
}
