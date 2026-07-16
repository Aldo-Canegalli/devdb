// frontend/src/pages/Community.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import FeaturedProjects from '../components/FeaturedProjects';
import ForumThread from '../components/ForumThread';

function Community() {
  const [activeTab, setActiveTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('general');
  const [creatingThread, setCreatingThread] = useState(false);
  const [message, setMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadFeed = async (type = 'all') => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '30');
      if (type !== 'all') {
        params.append('type', type);
      }
      const response = await api.get(`/community/feed?${params.toString()}`);
      setFeed(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadThreads = async () => {
    try {
      const response = await api.get('/forum/threads?limit=20');
      setThreads(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/community/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadTopUsers = async () => {
    try {
      const response = await api.get('/community/top-users?limit=10');
      setTopUsers(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadPopularTags = async () => {
    try {
      const response = await api.get('/repositories/tags/popular?limit=10');
      setPopularTags(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setMessage('❌ Debes iniciar sesión para crear un hilo');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      setMessage('❌ El título y contenido son requeridos');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setCreatingThread(true);
    try {
      await api.post('/forum/threads', {
        title: newThreadTitle,
        content: newThreadContent,
        category: newThreadCategory
      }, {
        headers: { 'user-id': user.id }
      });

      setMessage('✅ Hilo creado correctamente');
      setNewThreadTitle('');
      setNewThreadContent('');
      setNewThreadCategory('general');
      setShowNewThread(false);
      loadThreads();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al crear hilo'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setCreatingThread(false);
    }
  };

  const getActivityIcon = (action) => {
    const icons = {
      'create_repo': '📁',
      'upload_file': '📤',
      'edit_file': '✏️',
      'delete_file': '🗑️',
      'download_file': '⬇️',
      'star_repo': '⭐',
      'unstar_repo': '☆',
      'fork_repository': '🍴',
      'create_issue': '🐛',
      'comment_issue': '💬',
      'create_forum_thread': '📝',
      'comment_forum': '💬'
    };
    return icons[action] || '📌';
  };

  const getActivityMessage = (activity) => {
    const actions = {
      'create_repo': `creó el repositorio "${activity.repository_name}"`,
      'upload_file': `subió el archivo "${activity.file_name}"`,
      'edit_file': `editó el archivo "${activity.file_name}"`,
      'star_repo': `marcó con estrella "${activity.repository_name}"`,
      'fork_repository': `hizo fork de "${activity.repository_name}"`,
      'create_issue': `creó una incidencia en "${activity.repository_name}"`,
      'comment_issue': `comentó en "${activity.issue_title}"`,
      'create_forum_thread': `creó un hilo en el foro: "${activity.details?.title}"`,
      'comment_forum': `comentó en un hilo del foro`
    };
    return actions[activity.action] || activity.action;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'hace unos segundos';
    if (diffMins < 60) return `hace ${diffMins} minutos`;
    if (diffHours < 24) return `hace ${diffHours} horas`;
    if (diffDays < 7) return `hace ${diffDays} días`;
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        loadFeed(),
        loadThreads(),
        loadStats(),
        loadTopUsers(),
        loadPopularTags()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'feed') loadFeed();
    if (tab === 'foro') loadThreads();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando comunidad...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-6xl">
      <h1 className="text-4xl font-bold text-white mb-8">🌐 Comunidad</h1>

      {/* Mensaje temporal */}
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center mb-4">
          {message}
        </div>
      )}

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#132d46] rounded-xl p-4 text-center border border-gray-700">
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_users || 0}</div>
            <div className="text-sm text-gray-400">Usuarios</div>
          </div>
          <div className="bg-[#132d46] rounded-xl p-4 text-center border border-gray-700">
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_repos || 0}</div>
            <div className="text-sm text-gray-400">Repositorios</div>
          </div>
          <div className="bg-[#132d46] rounded-xl p-4 text-center border border-gray-700">
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_stars || 0}</div>
            <div className="text-sm text-gray-400">Estrellas</div>
          </div>
          <div className="bg-[#132d46] rounded-xl p-4 text-center border border-gray-700">
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_forks || 0}</div>
            <div className="text-sm text-gray-400">Forks</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700 mb-6">
        <button
          onClick={() => handleTabChange('feed')}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'feed' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Actividad
        </button>
        <button
          onClick={() => handleTabChange('projects')}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'projects' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          🎮 Proyectos destacados
        </button>
        <button
          onClick={() => handleTabChange('foro')}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'foro' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          💬 Foro
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Contenido principal */}
        <div className="md:col-span-2">
          {activeTab === 'feed' && (
            <div>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => { setFilter('all'); loadFeed('all'); }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filter === 'all' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setFilter('star'); loadFeed('star'); }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filter === 'star' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  ⭐ Estrellas
                </button>
                <button
                  onClick={() => { setFilter('fork'); loadFeed('fork'); }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filter === 'fork' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🍴 Forks
                </button>
                <button
                  onClick={() => { setFilter('comment'); loadFeed('comment'); }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filter === 'comment' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  💬 Comentarios
                </button>
                <button
                  onClick={() => { setFilter('repo'); loadFeed('repo'); }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filter === 'repo' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📁 Repos
                </button>
              </div>

              {feed.length === 0 ? (
                <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
                  <span className="text-5xl mb-4 block">📭</span>
                  <p className="text-gray-400">No hay actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feed.map((activity) => (
                    <div key={activity.id} className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getActivityIcon(activity.action)}</div>
                        <div>
                          <p className="text-gray-300">
                            <Link to={`/${activity.user_name}`} className="font-semibold text-white hover:text-[#01c38e] transition">
                              @{activity.user_name}
                            </Link>{' '}
                            {getActivityMessage(activity)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(activity.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <div className="flex gap-2 mb-4">
                <FeaturedProjects limit={6} type="all" />
              </div>
            </div>
          )}

          {activeTab === 'foro' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-400 text-sm">{threads.length} hilos en el foro</p>
                {isLoggedIn && (
                  <button
                    onClick={() => setShowNewThread(!showNewThread)}
                    className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition"
                  >
                    + Nuevo hilo
                  </button>
                )}
              </div>

              {/* Formulario nuevo hilo */}
              {showNewThread && (
                <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Crear nuevo hilo</h3>
                  <form onSubmit={handleCreateThread} className="space-y-4">
                    <select
                      value={newThreadCategory}
                      onChange={(e) => setNewThreadCategory(e.target.value)}
                      className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                    >
                      <option value="general">💬 General</option>
                      <option value="juegos">🎮 Juegos</option>
                      <option value="codigo">💻 Código</option>
                      <option value="ayuda">🆘 Ayuda</option>
                      <option value="sugerencias">💡 Sugerencias</option>
                    </select>
                    <input
                      type="text"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      placeholder="Título del hilo"
                      className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                      required
                    />
                    <textarea
                      value={newThreadContent}
                      onChange={(e) => setNewThreadContent(e.target.value)}
                      placeholder="Contenido del hilo..."
                      className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                      rows="5"
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={creatingThread}
                        className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {creatingThread ? 'Creando...' : 'Publicar hilo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewThread(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {threads.length === 0 ? (
                <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
                  <span className="text-5xl mb-4 block">📭</span>
                  <p className="text-gray-400">No hay hilos en el foro</p>
                  {isLoggedIn && (
                    <button
                      onClick={() => setShowNewThread(true)}
                      className="mt-4 bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition"
                    >
                      + Crear primer hilo
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {threads.map((thread) => (
                    <ForumThread key={thread.id} thread={thread} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 sticky top-20">
            <h3 className="text-lg font-bold text-white mb-4">🏆 Usuarios destacados</h3>
            {topUsers.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay usuarios destacados aún</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((user) => (
                  <Link to={`/${user.username}`} key={user.id} className="block">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1e29] transition">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-sm font-bold text-[#1a1e29] flex-shrink-0">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">@{user.username}</p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>⭐ {user.stars_received || 0}</span>
                          <span>📁 {user.repos_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Etiquetas populares */}
          {popularTags.length > 0 && (
            <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 mt-4">
              <h4 className="text-sm font-bold text-white mb-2">🏷️ Etiquetas populares</h4>
              <div className="flex flex-wrap gap-1">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/buscar?tag=${encodeURIComponent(tag.name)}`}
                    className="text-xs bg-[#1a1e29] hover:bg-[#01c38e] hover:text-[#1a1e29] transition px-2 py-1 rounded text-gray-300"
                  >
                    #{tag.name} ({tag.count})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Community;