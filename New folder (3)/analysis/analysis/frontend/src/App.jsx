import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DirectInterview from './pages/DirectInterview';
import FinalResults from './pages/FinalResults';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/" element={<DirectInterview />} />
                    <Route path="/results" element={<FinalResults />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
