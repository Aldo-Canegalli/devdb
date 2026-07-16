// frontend/src/pages/PullRequestDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function PullRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('commented');
  const [submitting, setSubmitting] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadPR = async () => {
    try {
      const response = await api.get(`/pull-requests/${id}`, {
        headers: { 'user-id': user.id }
      });
      setPr(response.data);
      setReviews(response.data.reviews || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        setPr(null);
        setLoading(false);
      }
    }
  };

  const handleMerge = async () => {
    if (!confirm('¿Confirmar fusión de este Pull Request?')) return;
    
    try {
      await api.put(`/pull-requests/${id}`, { status: 'merged' }, {
        headers: { 'user-id': user.id }
      });
      setMessage('✅ Pull Request fusionado correctamente');
      loadPR();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al fusionar'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleClose = async () => {
    if (!confirm('¿Cerrar este Pull Request sin fusionar?')) return;
    
    try {
      await api.put(`/pull-requests/${id}`, { status: 'closed' }, {
        headers: { 'user-id': user.id }
      });
      setMessage('✅ Pull Request cerrado');
      loadPR();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al cerrar'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setMessage('❌ Debes iniciar sesión para revisar');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/pull-requests/${id}/reviews`, {
        status: reviewStatus,
        comment: reviewComment
      }, {
        headers: { 'user-id': user.id }
      });
      setMessage('✅ Revisión agregada');
      setReviewComment('');
      loadPR();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al revisar'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'open': 'bg-green-600',
      'merged': 'bg-purple-600',
      'closed': 'bg-red-600',
      'draft': 'bg-gray-600'
    };
    return badges[status] || 'bg-gray-600';
  };

  const getReviewStatusBadge = (status) => {
    const badges = {
      'approved': 'bg-green-600',
      'changes_requested': 'bg-red-600',
      'commented': 'bg-blue-600',
      'pending': 'bg-gray-600'
    };
    return badges[status] || 'bg-gray-600';
  };

  const getReviewStatusLabel = (status) => {
    const labels = {
      'approved': '✅ Aprobado',
      'changes_requested': '🔄 Cambios solicitados',
      'commented': '💬 Comentado',
      'pending': '⏳ Pendiente'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PE');
  };

  useEffect(() => {
    loadPR();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando Pull Request...</p>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-bold text-white mb-2">Pull Request no encontrado</h2>
          <p className="text-gray-400 mb-6">El Pull Request que buscas no existe.</p>
          <Link to="/" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isRepoOwner = pr.to_repo_owner_id === user.id;
  const isCreator = pr.created_by === user.id;
  const canMerge = isRepoOwner && pr.status === 'open';
  const canReview = isLoggedIn && pr.status === 'open' && !isCreator;

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center mb-4">
          {message}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <Link to={`/repo/${pr.to_repo_id}`} className="text-[#01c38e] hover:text-emerald-400 transition text-sm">
          ← Volver al repositorio
        </Link>
        <Link to={`/pull-requests/${pr.to_repo_id}`} className="text-[#01c38e] hover:text-emerald-400 transition text-sm">
          Ver todos los PRs →
        </Link>
      </div>

      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className={`text-xs px-2 py-0.5 rounded text-white ${getStatusBadge(pr.status)}`}>
            {pr.status === 'open' ? '🟢 Abierta' : 
             pr.status === 'merged' ? '✅ Fusionada' : 
             pr.status === 'closed' ? '❌ Cerrada' : '📝 Borrador'}
          </span>
          <span className="text-xs text-gray-500">#{pr.id}</span>
        </div>

        <h1 className="text-2xl font-bold text-white">{pr.title}</h1>
        <p className="text-sm text-gray-400 mt-2">
          De: <Link to={`/repo/${pr.from_repo_id}`} className="text-[#01c38e] hover:underline">{pr.from_repo_name}</Link>
          {' → '}
          A: <Link to={`/repo/${pr.to_repo_id}`} className="text-[#01c38e] hover:underline">{pr.to_repo_name}</Link>
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
          <span>👤 @{pr.created_by_username}</span>
          <span>📅 {formatDate(pr.created_at)}</span>
          {pr.merged_at && <span>✅ Fusionado: {formatDate(pr.merged_at)}</span>}
          {pr.closed_at && <span>❌ Cerrado: {formatDate(pr.closed_at)}</span>}
        </div>

        {pr.description && (
          <div className="mt-4 p-4 bg-[#1a1e29] rounded-lg">
            <p className="text-gray-300 whitespace-pre-wrap">{pr.description}</p>
          </div>
        )}

        {/* Acciones para el dueño del repo */}
        {canMerge && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-3">
            <button
              onClick={handleMerge}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg transition"
            >
              ✅ Fusionar Pull Request
            </button>
            <button
              onClick={handleClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition"
            >
              ❌ Cerrar sin fusionar
            </button>
          </div>
        )}
      </div>

      {/* Revisiones */}
      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
          <h3 className="font-bold text-white">📝 Revisiones ({reviews.length})</h3>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay revisiones aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {reviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#01c38e]">
                    {review.reviewer_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">@{review.reviewer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded text-white ${getReviewStatusBadge(review.status)}`}>
                        {getReviewStatusLabel(review.status)}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-300 mt-1">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agregar revisión */}
      {canReview && (
        <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">✏️ Agregar revisión</h3>
          <form onSubmit={handleReview} className="space-y-4">
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
            >
              <option value="commented">💬 Comentar</option>
              <option value="approved">✅ Aprobar</option>
              <option value="changes_requested">🔄 Solicitar cambios</option>
            </select>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Comentarios sobre el Pull Request..."
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              rows="4"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar revisión'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default PullRequestDetail;