import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import SearchBar from '../components/SearchBar';

function Search() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    type: searchParams.get('type') || '',
    user: searchParams.get('user') || '',
    tag: searchParams.get('tag') || '',
    sort: searchParams.get('sort') || 'recent'
  });
  const [popularTags, setPopularTags] = useState([]);

  // Función para ejecutar la búsqueda con parámetros específicos
  const executeSearch = async (paramsObj) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paramsObj.q) params.append('q', paramsObj.q);
      if (paramsObj.type) params.append('type', paramsObj.type);
      if (paramsObj.user) params.append('user', paramsObj.user);
      if (paramsObj.tag) params.append('tag', paramsObj.tag);
      if (paramsObj.sort) params.append('sort', paramsObj.sort);
      params.append('limit', '30');

      const response = await api.get(`/repositories/search?${params.toString()}`);
      setResults(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar etiquetas populares
  const loadPopularTags = async () => {
    try {
      const response = await api.get('/repositories/tags/popular?limit=10');
      setPopularTags(response.data);
    } catch (error) {
      console.error('Error:', error);
      // Si falla, no mostrar nada
      setPopularTags([]);
    }
  };

  const handleFilterChange = (key, value) => {
  setFilters(prev => ({ ...prev, [key]: value }));
  
  // Si cambia la etiqueta, aplicar filtros automáticamente
  if (key === 'tag') {
    const params = new URLSearchParams();
    const newFilters = { ...filters, [key]: value };
    
    if (newFilters.q) params.append('q', newFilters.q);
    if (newFilters.type) params.append('type', newFilters.type);
    if (newFilters.user) params.append('user', newFilters.user);
    if (newFilters.tag) params.append('tag', newFilters.tag);
    if (newFilters.sort) params.append('sort', newFilters.sort);
    
    window.history.pushState({}, '', `/buscar?${params.toString()}`);
    executeSearch(newFilters);
  }
};

const applyFilters = () => {
  const params = new URLSearchParams();
  if (filters.q) params.append('q', filters.q);
  if (filters.type) params.append('type', filters.type);
  if (filters.user) params.append('user', filters.user);
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.sort) params.append('sort', filters.sort);
  
  window.history.pushState({}, '', `/buscar?${params.toString()}`);
  executeSearch(filters);
};

const clearFilters = () => {
  // Resetear filtros a valores vacíos
  const emptyFilters = { q: '', type: '', user: '', tag: '', sort: 'recent' };
  setFilters(emptyFilters);
  
  // Cambiar la URL sin parámetros
  window.history.pushState({}, '', '/buscar');
  
  // Ejecutar búsqueda con filtros vacíos (mostrará TODOS los repositorios públicos)
  executeSearch(emptyFilters);
};

  const getTypeLabel = (type) => {
    const labels = {
      'game': '🎮 Juego',
      'code': '💻 Código',
      'txt': '📚 Texto',
      'mixed': '🔀 Mixto'
    };
    return labels[type] || type;
  };

  const getSortLabel = (sort) => {
    const labels = {
      'recent': 'Más reciente',
      'stars': 'Más estrellas',
      'forks': 'Más forks',
      'name': 'Nombre (A-Z)',
      'popular': 'Más popular'
    };
    return labels[sort] || sort;
  };

  // Cargar etiquetas populares al montar el componente
  useEffect(() => {
    loadPopularTags();
  }, []);

  // Escuchar cambios en los parámetros de búsqueda
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const user = searchParams.get('user') || '';
    const tag = searchParams.get('tag') || '';
    const sort = searchParams.get('sort') || 'recent';
    
    const newFilters = { q, type, user, tag, sort };
    setFilters(newFilters);
    
    // Ejecutar búsqueda con los parámetros actuales
    executeSearch(newFilters);
  }, [searchParams]);

  return (
    <div className="container mx-auto px-6 py-16 max-w-6xl">
      {/* Título y buscador */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">🔍 Buscar repositorios</h1>
        <div className="flex justify-center">
          <SearchBar initialQuery={filters.q} />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-gray-300 text-sm mb-1">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            >
              <option value="">Todos</option>
              <option value="game">🎮 Juego</option>
              <option value="code">💻 Código</option>
              <option value="txt">📚 Texto</option>
              <option value="mixed">🔀 Mixto</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-gray-300 text-sm mb-1">Usuario</label>
            <input
              type="text"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder="@usuario"
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-gray-300 text-sm mb-1">Etiqueta</label>
            <input
              type="text"
              value={filters.tag}
              onChange={(e) => handleFilterChange('tag', e.target.value)}
              placeholder="ej: JavaScript"
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-gray-300 text-sm mb-1">Ordenar por</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            >
              <option value="recent">Más reciente</option>
              <option value="stars">Más estrellas</option>
              <option value="forks">Más forks</option>
              <option value="name">Nombre (A-Z)</option>
              <option value="popular">Más popular</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition"
            >
              Filtrar
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Etiquetas populares */}
        {popularTags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-2">🏷️ Etiquetas populares:</p>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
  <button
    key={tag.id}
    onClick={() => {
      // Actualizar el estado del filtro
      setFilters(prev => ({ ...prev, tag: tag.name }));
      
      // Crear URL con los filtros actuales
      const params = new URLSearchParams();
      const newFilters = { ...filters, tag: tag.name };
      
      if (newFilters.q) params.append('q', newFilters.q);
      if (newFilters.type) params.append('type', newFilters.type);
      if (newFilters.user) params.append('user', newFilters.user);
      if (newFilters.tag) params.append('tag', newFilters.tag);
      if (newFilters.sort) params.append('sort', newFilters.sort);
      
      window.history.pushState({}, '', `/buscar?${params.toString()}`);
      executeSearch(newFilters);
    }}
    className="text-xs px-3 py-1 rounded-full bg-[#1a1e29] hover:bg-[#01c38e] hover:text-[#1a1e29] transition text-gray-300 border border-gray-700"
    style={filters.tag === tag.name ? { backgroundColor: '#01c38e', color: '#1a1e29' } : {}}
  >
    {tag.name} ({tag.count})
  </button>
))}
            </div>
          </div>
        )}
      </div>

      {/* Resultados */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-400">
            {loading ? 'Buscando...' : `${total} resultado${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            {filters.q && ` para "${filters.q}"`}
          </p>
          {filters.sort && (
            <span className="text-sm text-gray-500">Ordenado por: {getSortLabel(filters.sort)}</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Buscando repositorios...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-[#132d46] rounded-2xl p-12 text-center border border-gray-700">
            <span className="text-6xl mb-4 block">🔍</span>
            <h2 className="text-2xl font-bold text-white mb-2">No se encontraron resultados</h2>
            <p className="text-gray-400">
              {filters.q ? `No hay repositorios que coincidan con "${filters.q}"` : 'Prueba con otros filtros'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((repo) => (
              <Link to={`/repo/${repo.id}`} key={repo.id}>
                <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition group">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {repo.repo_type === 'game' ? '🎮' : repo.repo_type === 'code' ? '💻' : '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-white group-hover:text-[#01c38e] transition truncate">
                          {repo.name}
                        </h4>
                        <span className="text-xs bg-[#1a1e29] px-2 py-0.5 rounded text-gray-400 flex-shrink-0 ml-2">
                          {getTypeLabel(repo.repo_type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {repo.description || 'Sin descripción'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/${repo.owner_name}`;
                          }}
                          className="hover:text-[#01c38e] transition cursor-pointer"
                        >
                          👤 @{repo.owner_name}
                        </span>
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
    </div>
  );
}

export default Search;