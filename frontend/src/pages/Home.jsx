import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import TokenValidator from '../components/TokenValidator';

function Home() {
  const [stats, setStats] = useState({
    total_repos: 0,
    total_users: 0,
    total_tokens: 0,
    total_downloads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get('/stats/overview');
        setStats({
          total_repos: response.data.total_repos || 0,
          total_users: response.data.total_users || 0,
          total_tokens: response.data.total_tokens || 0,
          total_downloads: response.data.total_downloads || 0
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="container mx-auto px-6 py-16">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-[#01c38e] rounded-2xl flex items-center justify-center">
            <span className="text-[#1a1e29] font-bold text-5xl">&lt;/&gt;</span>
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          <span className="text-[#01c38e]">DevDB</span>
          <span className="text-white"> Studio</span>
        </h1>
        <p className="text-xl text-gray-300 mb-4">
          Donde el código se encuentra con los juegos
        </p>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Publica juegos, comparte código, escribe documentación.
          Monetiza con nuestro sistema de tokens.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/store" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 px-8 rounded-lg transition text-lg">
            Explorar Tienda
          </Link>
          <Link to="/create" className="border-2 border-[#01c38e] text-[#01c38e] hover:bg-[#01c38e] hover:text-[#1a1e29] font-bold py-3 px-8 rounded-lg transition text-lg">
            Subir Contenido
          </Link>
        </div>
      </div>

      {/* Features - Ahora con enlaces a búsqueda */}
      <div className="grid md:grid-cols-3 gap-8 mt-20">
        <Link to="/buscar?type=game" className="bg-[#132d46] p-6 rounded-xl border border-gray-700 hover:border-[#01c38e] transition text-center hover:scale-105">
          <div className="w-16 h-16 bg-[#01c38e]/20 rounded-lg flex items-center justify-center text-3xl mx-auto mb-4">🎮</div>
          <h3 className="text-xl font-bold mb-2 text-white">Juegos</h3>
          <p className="text-gray-400">Sube y comparte tus juegos indie. Monetiza con sistema de tokens.</p>
          <span className="text-[#01c38e] text-sm mt-3 inline-block">Explorar juegos →</span>
        </Link>
        
        <Link to="/buscar?type=code" className="bg-[#132d46] p-6 rounded-xl border border-gray-700 hover:border-[#01c38e] transition text-center hover:scale-105">
          <div className="w-16 h-16 bg-[#01c38e]/20 rounded-lg flex items-center justify-center text-3xl mx-auto mb-4">💻</div>
          <h3 className="text-xl font-bold mb-2 text-white">Código</h3>
          <p className="text-gray-400">Repositorios de código con editor integrado y control de versiones.</p>
          <span className="text-[#01c38e] text-sm mt-3 inline-block">Explorar código →</span>
        </Link>
        
        <Link to="/buscar?type=txt" className="bg-[#132d46] p-6 rounded-xl border border-gray-700 hover:border-[#01c38e] transition text-center hover:scale-105">
          <div className="w-16 h-16 bg-[#01c38e]/20 rounded-lg flex items-center justify-center text-3xl mx-auto mb-4">📚</div>
          <h3 className="text-xl font-bold mb-2 text-white">Textos</h3>
          <p className="text-gray-400">Documentación, libros técnicos y tutoriales en formato markdown.</p>
          <span className="text-[#01c38e] text-sm mt-3 inline-block">Explorar textos →</span>
        </Link>
      </div>

      {/* Token Validator */}
      <div className="max-w-md mx-auto mt-20">
        <TokenValidator />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 text-center">
        <div className="bg-[#132d46] p-4 rounded-xl border border-gray-700">
          <div className="text-3xl font-bold text-[#01c38e]">{stats.total_repos}</div>
          <div className="text-gray-400 text-sm">Repositorios</div>
        </div>
        <div className="bg-[#132d46] p-4 rounded-xl border border-gray-700">
          <div className="text-3xl font-bold text-[#01c38e]">{stats.total_users}</div>
          <div className="text-gray-400 text-sm">Desarrolladores</div>
        </div>
        <div className="bg-[#132d46] p-4 rounded-xl border border-gray-700">
          <div className="text-3xl font-bold text-[#01c38e]">{stats.total_tokens}</div>
          <div className="text-gray-400 text-sm">Tokens activos</div>
        </div>
        <div className="bg-[#132d46] p-4 rounded-xl border border-gray-700">
          <div className="text-3xl font-bold text-[#01c38e]">{stats.total_downloads}</div>
          <div className="text-gray-400 text-sm">Descargas</div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 text-center bg-[#132d46] rounded-2xl p-12 border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-4">¿Listo para compartir tu trabajo?</h2>
        <p className="text-gray-400 mb-6">Únete a la comunidad de desarrolladores</p>
        <Link to="/register" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 px-8 rounded-lg transition inline-block">
          Comenzar ahora
        </Link>
      </div>
    </div>
  );
}

export default Home;