import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadIssue = async () => {
    try {
      const config = isLoggedIn ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(`/issues/${id}`, config);
      setIssue(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        setLoading(false);
      }
    }
  };

  const loadComments = async () => {
    try {
      const config = isLoggedIn ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(`/issues/${id}/comments`, config);
      setComments(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSending(true);
    
    try {
      await api.post(`/issues/${id}/comments`, {
        content: newComment
      }, {
        headers: { 'user-id': user.id }
      });
      
      setNewComment('');
      loadComments();
      setMessage('✅ Comentario agregado');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al comentar'}`);
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSending(false);
    }
  };

  const updateIssue = async (changes) => {
    setUpdating(true);
    
    try {
      await api.put(`/issues/${id}`, changes, {
        headers: { 'user-id': user.id }
      });
      
      loadIssue();
      setMessage('✅ Incidencia actualizada');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al actualizar'}`);
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setUpdating(false);
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
    loadIssue();
    loadComments();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando incidencia...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-bold text-white mb-2">Incidencia no encontrada</h2>
          <p className="text-gray-400 mb-6">La incidencia que buscas no existe o no tienes acceso.</p>
          <Link to="/store" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const isRepoOwner = issue.repo_owner_id === user.id;
  const canManage = isRepoOwner || issue.created_by === user.id;

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      {/* Cabecera de la incidencia */}
      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-6">
        {message && (
          <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center mb-4">
            {message}
          </div>
        )}
        
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm">{getStatusLabel(issue.status)}</span>
              <span className={`text-xs px-2 py-0.5 rounded text-white ${getPriorityColor(issue.priority)}`}>
                {getPriorityLabel(issue.priority)}
              </span>
              <span className="text-xs text-gray-500">#{issue.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">{issue.title}</h1>
            <div className="text-sm text-gray-400 mt-2 flex gap-4 flex-wrap">
              <span>👤 Creado por @{issue.creador || 'desconocido'}</span>
              {issue.asignado && <span>📌 Asignado a @{issue.asignado}</span>}
              <span>📅 {new Date(issue.created_at).toLocaleDateString()}</span>
              {issue.closed_at && <span>🔒 Cerrado el {new Date(issue.closed_at).toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/repo/${issue.repository_id}`} className="text-[#01c38e] hover:underline text-sm">
              Ver repositorio →
            </Link>
          </div>
        </div>
        
        {issue.description && (
          <div className="mt-4 p-4 bg-[#1a1e29] rounded-lg">
            <p className="text-gray-300 whitespace-pre-wrap">{issue.description}</p>
          </div>
        )}
        
        {/* Acciones - Solo para el dueño o mantenedor */}
{isLoggedIn && (isRepoOwner || canManage) && (
  <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-3">
    {issue.status === 'open' && (
      <button
        onClick={() => updateIssue({ status: 'in_progress' })}
        disabled={updating}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
      >
        Iniciar trabajo
      </button>
    )}
    {issue.status === 'in_progress' && (
      <button
        onClick={() => updateIssue({ status: 'closed' })}
        disabled={updating}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
      >
        Cerrar incidencia
      </button>
    )}
    {issue.status !== 'closed' && (
      <button
        onClick={() => updateIssue({ status: 'closed' })}
        disabled={updating}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
      >
        Cerrar sin resolver
      </button>
    )}
    {issue.status === 'closed' && (
      <button
        onClick={() => updateIssue({ status: 'open' })}
        disabled={updating}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
      >
        Reabrir incidencia
      </button>
    )}
  </div>
)}
      </div>

      {/* Comentarios */}
      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
          <h3 className="font-bold text-white">Comentarios ({comments.length})</h3>
        </div>
        
        {comments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay comentarios aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#01c38e]">
                    {comment.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">@{comment.username}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Agregar comentario */}
        {isLoggedIn && (
          <div className="p-4 border-t border-gray-700 bg-[#1a1e29]">
            <form onSubmit={handleComment} className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
              />
              <button
                type="submit"
                disabled={sending}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {sending ? '...' : 'Comentar'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueDetail;