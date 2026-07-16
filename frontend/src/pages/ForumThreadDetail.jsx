// frontend/src/pages/ForumThreadDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function ForumThreadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadThread = async () => {
    try {
      const response = await api.get(`/forum/threads/${id}`);
      setThread(response.data.thread);
      setComments(response.data.comments);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        setThread(null);
        setLoading(false);
      }
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setMessage('❌ Debes iniciar sesión para comentar');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!newComment.trim()) {
      setMessage('❌ El comentario no puede estar vacío');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/forum/threads/${id}/comments`, {
        content: newComment
      }, {
        headers: { 'user-id': user.id }
      });

      setComments([...comments, response.data.comment]);
      setNewComment('');
      setMessage('✅ Comentario agregado');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al comentar'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PE');
  };

  useEffect(() => {
    loadThread();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando hilo...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-bold text-white mb-2">Hilo no encontrado</h2>
          <p className="text-gray-400 mb-6">El hilo que buscas no existe.</p>
          <Link to="/community" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Volver a la comunidad
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center mb-4">
          {message}
        </div>
      )}

      <Link to="/community" className="text-[#01c38e] hover:underline text-sm mb-4 inline-block">
        ← Volver a la comunidad
      </Link>

      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-8">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-2 py-0.5 rounded">
            {thread.category}
          </span>
          {thread.is_pinned && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">📌 Fijado</span>
          )}
          {thread.is_locked && (
            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">🔒 Bloqueado</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{thread.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
          <Link to={`/${thread.author_name}`} className="hover:text-[#01c38e] transition">
            @{thread.author_name}
          </Link>
          <span>📅 {formatDate(thread.created_at)}</span>
          <span>👁️ {thread.views || 0} vistas</span>
        </div>
        <div className="mt-4 p-4 bg-[#1a1e29] rounded-lg">
          <p className="text-gray-300 whitespace-pre-wrap">{thread.content}</p>
        </div>
      </div>

      {/* Comentarios */}
      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
          <h3 className="font-bold text-white">Comentarios ({comments.length})</h3>
        </div>

        {comments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay comentarios aún. ¡Sé el primero!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#01c38e]">
                    {comment.author_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/${comment.author_name}`} className="font-semibold text-white hover:text-[#01c38e] transition">
                        @{comment.author_name}
                      </Link>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!thread.is_locked && isLoggedIn && (
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

        {thread.is_locked && (
          <div className="p-4 text-center text-gray-500 text-sm">
            🔒 Este hilo está bloqueado, no se pueden agregar comentarios
          </div>
        )}
      </div>
    </div>
  );
}

export default ForumThreadDetail;