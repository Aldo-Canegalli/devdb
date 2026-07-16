import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import SkeletonCard from '../components/SkeletonCard';

function Library() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.id) {
      api.get(`/repositories?owner=${user.id}`, {
        headers: { 'user-id': user.id }
      })
        .then(response => {
          setRepositories(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user.id]);

if (loading) {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-white">Mi Biblioteca</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} type="repo" />
        ))}
      </div>
    </div>
  );
}

  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-white">Mi Biblioteca</h1>
      
      {repositories.length === 0 ? (
        <div className="bg-[#132d46] rounded-2xl p-12 text-center border border-gray-700">
          <span className="text-6xl mb-4 block">📚</span>
          <h2 className="text-2xl font-bold text-white mb-2">No tienes repositorios</h2>
          <p className="text-gray-400 mb-6">Aún no eres dueño o colaborador de ningún repositorio.</p>
          <Link to="/create" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 px-6 rounded-lg transition inline-block">
            Crear mi primer repositorio
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <Link to={`/repo/${repo.id}`} key={repo.id}>
              <div className="bg-[#132d46] rounded-xl border border-gray-700 p-5 hover:border-[#01c38e] transition group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                    {repo.repo_type === 'game' ? '🎮' : repo.repo_type === 'code' ? '💻' : '📚'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white group-hover:text-[#01c38e] transition">{repo.name}</h3>
                    <Link to={`/${repo.owner_name}`} className="text-sm text-gray-400 hover:text-[#01c38e] transition">
                      por @{repo.owner_name}
                    </Link>
                    {!repo.is_owner && repo.collaborator_role && (
                      <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded mt-1 inline-block">
                        Colaborador • {repo.collaborator_role === 'maintainer' ? 'Mantenedor' : 
                                       repo.collaborator_role === 'writer' ? 'Editor' : 
                                       repo.collaborator_role === 'reader' ? 'Lector' : 'Probador'}
                      </span>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>⭐ {repo.stars_count || 0}</span>
                      <span>🍴 {repo.forks_count || 0}</span>
                      <span>📅 {new Date(repo.created_at).toLocaleDateString()}</span>
                    </div>
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

export default Library;