import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import SkeletonCard from '../components/SkeletonCard';

function Store() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/repositories')
      .then(response => {
        setRepositories(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });
  }, []);

if (loading) {
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-white">Tienda</h1>
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonCard key={i} type="repo" />
        ))}
      </div>
    </div>
  );
}

  if (repositories.length === 0) {
    return (
      <div className="container mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8 text-white">Tienda</h1>
        <div className="bg-[#132d46] rounded-2xl p-12 text-center border border-gray-700">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-white mb-2">No hay repositorios públicos aún</h2>
          <p className="text-gray-400 mb-6">¡Sé el primero en compartir tu contenido con la comunidad!</p>
          <Link to="/create" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2">
            <span>+</span> Subir contenido
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-white">Tienda</h1>
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {repositories.map((repo) => (
          <Link to={`/repo/${repo.id}`} key={repo.id}>
            <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden hover:border-[#01c38e] hover:scale-105 transition-all h-full flex flex-col">
              <div className="h-32 bg-gradient-to-r from-[#01c38e] to-emerald-600 flex items-center justify-center">
                  {repo.repo_type === 'game' && <span className="text-5xl">🎮</span>}
                  {repo.repo_type === 'code' && <span className="text-5xl">&lt;/&gt;</span>}
                  {repo.repo_type === 'txt' && <span className="text-5xl">📚</span>}
                  {repo.repo_type === 'mixed' && <span className="text-5xl">📦</span>}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-white truncate">{repo.name}</h3>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/${repo.owner_name}`;
                  }}
                  className="text-sm text-gray-400 hover:text-[#01c38e] transition cursor-pointer"
                >
                  por @{repo.owner_name}
                </span>
                
                {/* Etiquetas */}
                {repo.tags && repo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {repo.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-1.5 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {repo.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{repo.tags.length - 3}</span>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                  <span className="text-xs bg-[#1a1e29] px-2 py-1 rounded text-gray-300">
                    {repo.repo_type === 'game' ? 'Juego' : repo.repo_type === 'code' ? 'Código' : 'Texto'}
                  </span>
                  <span className="text-[#01c38e] text-sm">Ver →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Store;