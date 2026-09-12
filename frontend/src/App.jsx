import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AnalyzePage from './pages/AnalyzePage';
import ResultsPage from './pages/ResultsPage';
import SessionsPage from './pages/SessionsPage';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard',     sub: 'Welcome to Resume Analyzer' },
  analyze:   { title: 'New Analysis',  sub: 'Upload JD and resumes to rank candidates' },
  results:   { title: 'Analysis Results', sub: 'Candidates ranked by AI score' },
  sessions:  { title: 'Past Sessions', sub: 'Previous analysis runs' },
  insights:  { title: 'AI Insights',   sub: 'Interview questions and candidate insights' },
};

export default function App() {
  const [page, setPage]           = useState('dashboard');
  const [results, setResults]     = useState(null);
  const [fromPage, setFromPage]   = useState('analyze');

  const handleResults = (data, sourcePage = 'analyze') => {
    setResults(data);
    setFromPage(sourcePage);
    setPage('results');
  };

  const handleNavigate = (p) => {
    setPage(p);
    if (p !== 'results') setResults(null);
  };

  const { title, sub } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  return (
    <div className="app-layout">
      <Sidebar currentPage={page === 'results' ? fromPage : page} onNavigate={handleNavigate} />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>
        </header>

        {page === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
        {page === 'analyze'   && <AnalyzePage   onResults={(data) => handleResults(data, 'analyze')} />}
        {page === 'results'   && results && <ResultsPage data={results} fromPage={fromPage} onBack={() => setPage(fromPage)} />}
        {page === 'sessions'  && <SessionsPage  onLoadSession={(data) => handleResults(data, 'sessions')} />}

        {page === 'insights' && (
          <div className="page">
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <div className="empty-title">AI Insights</div>
              <div className="empty-sub">Run an analysis first to see AI-generated interview insights here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
