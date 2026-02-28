import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CandidateLogin from './pages/CandidateLogin';
import CandidateDashboard from './pages/CandidateDashboard';
import JobBoard from './pages/JobBoard';
import TestEnvironment from './pages/TestEnvironment';
import SubmissionSuccess from './pages/SubmissionSuccess';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="dark:bg-gray-950 min-h-screen transition-colors duration-200">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/candidate" element={<CandidateLogin />} />
            <Route path="/candidate/dashboard" element={<JobBoard />} />
            <Route path="/candidate/application" element={<CandidateDashboard />} />
            <Route path="/test" element={<TestEnvironment />} />
            <Route path="/success" element={<SubmissionSuccess />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
