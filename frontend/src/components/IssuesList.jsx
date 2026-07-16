import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function IssuesList({ repoId, isOwner }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadIssues = async () => {
    try {
      let url = `/issues/repositories/${repoId}`;
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (params.toString()) url += '?' + params.toString();
      
      const config = isLoggedIn ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(url, config);
      setIssues(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setCreating(true);
    setMessage('');
    
    try {
      await api.post(`/issues/repositories/${repoId}`, {
        title: newTitle,
        description: newDescription,
        priority: newPriority
      }, {
        headers: { 'user-id': user.id }
      });
      
      setMessage('✅ Incidencia creada correctamente');
      setNewTitle('');
      setNewDescription('');
      setNewPriority('normal');
      setShowCreate(false);
      loadIssues();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al crear incidencia'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'bg-red-600',
      'high': 'bg-orange-500',
      'normal': 'bg-blue-500',
      'low': 'bg-gray-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'critical': 'Crítica',
      'high': 'Alta',
      'normal': 'Normal',
      'low': 'Baja'
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': '🔴 Abierta',
      'in_progress': '🟡 En progreso',
      'closed': '✅ Cerrada'
    };
    return labels[status] || status;
  };

  useEffect(() => {
    loadIssues();
  }, [repoId, filterStatus, filterPriority]);

  if (loading) {
    return (
      <div className="bg-[#132d46] rounded-xl p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-2">Cargando incidencias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensaje temporal */}
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center">
          {message}
        </div>
      )}

      {/* Filtros y acciones */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilterStatus(''); setFilterPriority(''); }}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              !filterStatus && !filterPriority ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'open' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Abiertas
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'in_progress' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            En progreso
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'closed' ? 'bg-[#01c38e] text-[#1a1e29]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Cerradas
          </button>
        </div>
        
        {isLoggedIn && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition"
          >
            + Nueva incidencia
          </button>
        )}
      </div>

      {/* Formulario de creación */}
      {showCreate && (
        <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Crear nueva incidencia</h3>
          <form onSubmit={handleCreateIssue} className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título de la incidencia"
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              required
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe el problema o sugerencia..."
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              rows="4"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
            >
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 py-2 rounded-lg transition disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear incidencia'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de incidencias */}
      {issues.length === 0 ? (
        <div className="bg-[#132d46] rounded-xl p-12 text-center border border-gray-700">
          <span className="text-5xl mb-4 block">📭</span>
          <h3 className="text-xl font-bold text-white mb-2">No hay incidencias</h3>
          <p className="text-gray-400">Este repositorio no tiene incidencias reportadas.</p>
          {isLoggedIn && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition inline-flex items-center gap-2"
            >
              <span>+</span> Reportar incidencia
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link to={`/incidencia/${issue.id}`} key={issue.id}>
              <div className="bg-[#132d46] rounded-xl border border-gray-700 p-4 hover:border-[#01c38e] transition hover:scale-[1.01]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm">{getStatusLabel(issue.status)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${getPriorityColor(issue.priority)}`}>
                        {getPriorityLabel(issue.priority)}
                      </span>
                      <span className="text-xs text-gray-500">#{issue.id}</span>
                    </div>
                    <h4 className="text-white font-bold mt-1 group-hover:text-[#01c38e] transition">
                      {issue.title}
                    </h4>
                    <div className="text-sm text-gray-400 mt-1 flex gap-4 flex-wrap">
                      <span>👤 @{issue.creador || 'desconocido'}</span>
                      {issue.asignado && <span>📌 Asignado a @{issue.asignado}</span>}
                      <span>📅 {new Date(issue.created_at).toLocaleDateString()}</span>
                      {issue.comentarios_count > 0 && (
                        <span>💬 {issue.comentarios_count} comentarios</span>
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

export default IssuesList;