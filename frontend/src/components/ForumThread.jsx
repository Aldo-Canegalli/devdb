// frontend/src/components/ForumThread.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function ForumThread({ thread, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAuthor = thread.author_id === user.id;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'hace unos segundos';
    if (diffMins < 60) return `hace ${diffMins} minutos`;
    if (diffHours < 24) return `hace ${diffHours} horas`;
    if (diffDays < 7) return `hace ${diffDays} días`;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {thread.is_pinned && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">📌 Fijado</span>
            )}
            {thread.is_locked && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">🔒 Bloqueado</span>
            )}
            <span className="text-xs text-gray-500">#{thread.id}</span>
            <span className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-2 py-0.5 rounded">
              {thread.category}
            </span>
          </div>
          <Link to={`/foro/${thread.id}`}>
            <h3 className="text-white font-bold hover:text-[#01c38e] transition truncate">
              {thread.title}
            </h3>
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <Link to={`/${thread.author_name}`} className="hover:text-[#01c38e] transition">
              @{thread.author_name}
            </Link>
            <span>💬 {thread.comments_count || 0} comentarios</span>
            <span>👁️ {thread.views || 0} vistas</span>
            <span>{formatDate(thread.created_at)}</span>
          </div>
        </div>
        {isAuthor && (
          <button
            onClick={() => {
              if (confirm('¿Eliminar este hilo?')) {
                onDelete?.(thread.id);
              }
            }}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export default ForumThread;