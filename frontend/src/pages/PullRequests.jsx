// frontend/src/pages/PullRequests.jsx
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

function PullRequests() {
  const { repoId } = useParams();
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [repo, setRepo] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadPRs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/pull-requests/repositories/${repoId}?status=${filter}`, {
        headers: { 'user-id': user.id }
      });
      setPullRequests(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepo = async () => {
    try {
      const response = await api.get(`/repositories/${repoId}`, {
        headers: { 'user-id': user.id }
      });
      setRepo(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'open': 'bg-green-600 text-white',
      'merged': 'bg-purple-600 text-white',
      'closed': 'bg-red-600 text-white',
      'draft': 'bg-gray-600 text-white'
    };
    return badges[status] || 'bg-gray-600 text-white';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': '🟢 Abierta',
      'merged': '✅ Fusionada',
      'closed': '❌ Cerrada',
      'draft': '📝 Borrador'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-PE');
  };

  useEffect(() => {
    if (repoId) {
      loadRepo();
      loadPRs();
    }
  }, [repoId, filter]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando Pull Requests...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">🔀 Pull Requests</h1>
          {repo && (
            <p className="text-gray-400 text-sm mt-1">
              Repositorio: <Link to={`/repo/${repo.id}`} className="text-[#01c38e] hover:underline">{repo.name}</Link>
            </p>
          )}
        </div>
        <Link
          to={`/repo/${repoId}`}
          className="text-[#01c38e] hover:text-emerald-400 transition text-sm"
        >
          ← Volver al repositorio
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'open' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Abiertas
        </button>
        <button
          onClick={() => setFilter('merged')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'merged' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Fusionadas
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'closed' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Cerradas
        </button>
      </div>

      {pullRequests.length === 0 ? (
        <div className="bg-[#132d46] rounded-xl p-12 text-center border border-gray-700">
          <span className="text-5xl mb-4 block">🔀</span>
          <h2 className="text-2xl font-bold text-white mb-2">No hay Pull Requests</h2>
          <p className="text-gray-400">
            {filter === 'open' 
              ? 'No hay solicitudes de fusión abiertas para este repositorio.' 
              : `No hay Pull Requests ${filter === 'merged' ? 'fusionadas' : 'cerradas'}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <Link to={`/pull/${pr.id}`} key={pr.id}>
              <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusBadge(pr.status)}`}>
                        {getStatusLabel(pr.status)}
                      </span>
                      <span className="text-xs text-gray-500">#{pr.id}</span>
                    </div>
                    <h3 className="text-white font-bold hover:text-[#01c38e] transition mt-1">
                      {pr.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {pr.description || 'Sin descripción'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                      <span>👤 @{pr.created_by_username}</span>
                      <span>📅 {formatDate(pr.created_at)}</span>
                      <span>📁 De: {pr.from_repo_name} → {pr.to_repo_name}</span>
                      {pr.reviews_count > 0 && (
                        <span>💬 {pr.reviews_count} revisiones</span>
                      )}
                      {pr.approvals_count > 0 && (
                        <span>✅ {pr.approvals_count} aprobaciones</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[#01c38e] text-sm flex items-center gap-1">
                    Ver →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default PullRequests;