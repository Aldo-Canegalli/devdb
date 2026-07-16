// frontend/src/components/FeaturedProjects.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function FeaturedProjects({ limit = 6, type = 'all' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const params = new URLSearchParams();
        params.append('limit', limit);
        if (type !== 'all') {
          params.append('type', type);
        }
        const response = await api.get(`/forum/featured-projects?${params.toString()}`);
        setProjects(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [limit, type]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No hay proyectos destacados aún</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Link to={`/repo/${project.id}`} key={project.id}>
          <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden hover:border-[#01c38e] hover:scale-105 transition-all h-full flex flex-col">
            <div className="h-24 bg-gradient-to-r from-[#01c38e] to-emerald-600 flex items-center justify-center">
              {project.repo_type === 'game' && <span className="text-3xl">🎮</span>}
              {project.repo_type === 'code' && <span className="text-3xl">&lt;/&gt;</span>}
              {project.repo_type === 'txt' && <span className="text-3xl">📚</span>}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h4 className="font-bold text-white truncate">{project.name}</h4>
              <p className="text-sm text-gray-400 truncate">{project.description || 'Sin descripción'}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {project.tags && project.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-1.5 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                <span>⭐ {project.stars_count || 0}</span>
                <span>🍴 {project.forks_count || 0}</span>
                <span>👤 @{project.owner_name}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default FeaturedProjects;