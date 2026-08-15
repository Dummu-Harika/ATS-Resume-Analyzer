import { useState } from 'react'
import Interview from './components/Interview'
import Results from './components/Results'
import Screening from './components/Screening'
import Recruiter from './components/Recruiter'
import './index.css'

function App() {
  const [view, setView] = useState('landing') // views: landing, screening, interview, results, recruiter
  const [field, setField] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [initialQuestion, setInitialQuestion] = useState(null)
  const [finalReport, setFinalReport] = useState(null)
  const [candidateId, setCandidateId] = useState(null)
  const [candidateName, setCandidateName] = useState('')

  const startQuiz = async (selectedField) => {
    try {
      const response = await fetch('http://localhost:8001/start_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: selectedField })
      })
      const data = await response.json()
      setSessionId(data.session_id)
      setField(selectedField)
      setInitialQuestion(data.question)
      setView('interview')
    } catch (error) {
      console.error("Failed to start session", error)
      alert("Failed to start quiz. backend might be offline.")
    }
  }

  const handleProceedToQuiz = (selectedField, id, name) => {
    setCandidateId(id);
    setCandidateName(name);
    startQuiz(selectedField);
  }

  const finishQuiz = (report) => {
    setFinalReport(report)
    setView('results')
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', textAlign: 'center', position: 'relative' }}>
        {view !== 'landing' && (
          <button
            onClick={() => setView('landing')}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer' }}
          >
            ← Back to Home
          </button>
        )}
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>NeuroInterview.ai</h1>
        <p className="subtitle">AI-Powered Recruitment Pipeline</p>
      </header>

      <main>
        {view === 'landing' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div className="glass-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', padding: '3rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👨‍💻</div>
              <h2>Job Seeker</h2>
              <p className="subtitle" style={{ marginBottom: '2rem' }}>
                Upload your resume, pass the screening, and take a technical quiz to get hired.
              </p>
              <button
                className="btn"
                onClick={() => setView('screening')}
                style={{ width: '100%', padding: '1rem' }}
              >
                Apply for Jobs
              </button>
            </div>

            <div className="glass-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', padding: '3rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
              <h2>Recruiter</h2>
              <p className="subtitle" style={{ marginBottom: '2rem' }}>
                Manage the candidate pool, review AI analysis, and shortlist top talent.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => setView('recruiter')}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Recruiter Dashboard
              </button>
            </div>
          </div>
        )}

        {view === 'screening' && (
          <Screening onProceed={handleProceedToQuiz} />
        )}

        {view === 'recruiter' && (
          <Recruiter />
        )}

        {view === 'interview' && (
          <Interview
            sessionId={sessionId}
            field={field}
            initialQuestion={initialQuestion}
            onFinish={finishQuiz}
          />
        )}

        {view === 'results' && finalReport && (
          <Results report={finalReport} candidateId={candidateId} candidateName={candidateName} field={field} onRestart={() => setView('landing')} />
        )}
      </main>
    </div>
  )
}

export default App
