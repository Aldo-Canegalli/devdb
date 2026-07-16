// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatsCards from '../components/StatsCards';
import ActivityChart from '../components/ActivityChart';
import ActivityTypeChart from '../components/ActivityTypeChart';
import TopReposList from '../components/TopReposList';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [topRepos, setTopRepos] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, typesRes, reposRes, usersRes] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/activity?days=30'),
        api.get('/stats/activity-types?days=30'),
        api.get('/stats/top-repos?limit=10'),
        api.get('/stats/top-users?limit=10'),
      ]);

      setStats(statsRes.data);
      setActivity(activityRes.data);
      setActivityTypes(typesRes.data);
      setTopRepos(reposRes.data);
      setTopUsers(usersRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">📊 Dashboard</h1>
        <button
          onClick={loadData}
          className="text-sm text-[#01c38e] hover:text-emerald-400 transition"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      {stats && <StatsCards stats={stats} />}

      {/* Gráficas - Fila 1 */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <ActivityChart data={activity} />
        <ActivityTypeChart data={activityTypes} />
      </div>

      {/* Gráficas - Fila 2 */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <TopReposList repos={topRepos} />

        {/* Top usuarios */}
        <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
            <h3 className="font-bold text-white">🏅 Usuarios más activos</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {topUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No hay usuarios activos aún</p>
              </div>
            ) : (
              topUsers.map((user, index) => (
                <Link to={`/${user.username}`} key={user.id}>
                  <div className="p-3 hover:bg-[#1a1e29] transition flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#01c38e]">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">@{user.username}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>📁 {user.repos_created || 0} repos</span>
                        <span>⭐ {user.stars_received || 0} estrellas</span>
                        <span>🍴 {user.forks_received || 0} forks</span>
                        <span>🐛 {user.issues_created || 0} issues</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.total_actions || 0} acciones
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;