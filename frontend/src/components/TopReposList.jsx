// frontend/src/components/TopReposList.jsx
import { Link } from 'react-router-dom';

function TopReposList({ repos }) {
  const getTypeIcon = (type) => {
    return type === 'game' ? '🎮' : type === 'code' ? '💻' : '📚';
  };

  return (
    <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
        <h3 className="font-bold text-white">🏆 Repositorios más populares</h3>
      </div>
      <div className="divide-y divide-gray-700">
        {repos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay repositorios aún</p>
          </div>
        ) : (
          repos.map((repo, index) => (
            <Link to={`/repo/${repo.id}`} key={repo.id}>
              <div className="p-3 hover:bg-[#1a1e29] transition flex items-center gap-3">
                <div className="w-7 h-7 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#01c38e]">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getTypeIcon(repo.repo_type)}</span>
                    <span className="font-medium text-white truncate">{repo.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">por @{repo.owner_name}</p>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>⭐ {repo.stars_count || 0}</span>
                  <span>🍴 {repo.forks_count || 0}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default TopReposList;