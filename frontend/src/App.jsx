import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoadingBar from './components/LoadingBar';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import Store from './pages/Store';
import Library from './pages/Library';
import Register from './pages/Register';
import Login from './pages/Login';
import CreateRepo from './pages/CreateRepo';
import RepoDetail from './pages/RepoDetail';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import IssueDetail from './pages/IssueDetail';
import Community from './pages/Community';
import ForumThreadDetail from './pages/ForumThreadDetail';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Conversation from './pages/Conversation';
import PullRequests from './pages/PullRequests';
import PullRequestDetail from './pages/PullRequestDetail';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user:', e);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      window.dispatchEvent(new Event('loadingStart'));
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('loadingComplete'));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, loading]);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    setLoading(true);
    localStorage.removeItem('user');
    setUser(null);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 400);
  };

  // ⬇️ AQUÍ EL CONDICIONAL ⬇️
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#1a1e29]">
      <LoadingBar />
      <Header user={user} onLogout={handleLogout} />
      <Sidebar user={user} />
      <main className="lg:mr-80 transition-all duration-300">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/store" element={<Store user={user} />} />
          <Route path="/library" element={<Library user={user} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/create" element={<CreateRepo user={user} />} />
          <Route path="/repo/:id" element={<RepoDetail user={user} />} />
          <Route path="/:username" element={<Profile user={user} />} />
          <Route path="/buscar" element={<Search user={user} />} />
          <Route path="/notificaciones" element={<Notifications user={user} />} />
          <Route path="/incidencia/:id" element={<IssueDetail user={user} />} />
          <Route path="/community" element={<Community user={user} />} />
          <Route path="/foro/:id" element={<ForumThreadDetail user={user} />} />
          <Route path="/friends/:userId" element={<Friends />} />
          <Route path="/friends" element={<Friends />} />   
          <Route path="/mensajes" element={<Messages user={user} />} />
          <Route path="/mensajes/:userId" element={<Conversation user={user} />} />
          <Route path="/pull-requests/:repoId" element={<PullRequests user={user} />} />
          <Route path="/pull/:id" element={<PullRequestDetail user={user} />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;