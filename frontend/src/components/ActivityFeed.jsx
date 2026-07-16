import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function ActivityFeed({ limit = 5 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  useEffect(() => {
    const loadActivity = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/users/${user.id}/activity?limit=${limit}`, {
          headers: { 'user-id': user.id }
        });
        setActivities(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
    const interval = setInterval(loadActivity, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn, user.id, limit]);

  if (!isLoggedIn) {
    return (
      <div className="text-center text-gray-400 text-sm">
        <Link to="/login" className="text-[#01c38e] hover:underline">Inicia sesión</Link> para ver tu actividad
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700/50 rounded w-1/2 mt-1"></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center">No hay actividad reciente</p>
    );
  }

  const getIcon = (action) => {
    const icons = {
      'create_repo': '📁',
      'upload_file': '📤',
      'edit_file': '✏️',
      'delete_file': '🗑️',
      'download_file': '⬇️',
      'star_repo': '⭐',
      'unstar_repo': '☆',
      'generate_token': '🔑',
      'revoke_token': '🚫',
      'fork_repository': '🍴',
      'create_issue': '🐛',
      'comment_issue': '💬',
      'update_issue': '📝',
      'follow_user': '👥',
      'unfollow_user': '🚫',
      'sync_fork': '🔄',
      'create_forum_thread': '📝',
      'comment_forum': '💬'
    };
    return icons[action] || '📌';
  };

  const getMessage = (activity) => {
    const messages = {
      'create_repo': `creaste el repositorio "${activity.repo_name}"`,
      'upload_file': `subiste el archivo "${activity.file_name}"`,
      'edit_file': `editaste el archivo "${activity.file_name}"`,
      'delete_file': `eliminaste el archivo "${activity.file_name}"`,
      'download_file': `descargaste el archivo "${activity.file_name}"`,
      'star_repo': `marcaste con estrella "${activity.repo_name}"`,
      'unstar_repo': `quitaste la estrella de "${activity.repo_name}"`,
      'generate_token': `generaste un token de acceso`,
      'revoke_token': `revocaste un token de acceso`,
      'fork_repository': `hiciste fork de "${activity.repo_name}"`,
      'create_issue': `creaste la incidencia "${activity.issue_title}"`,
      'comment_issue': `comentaste en "${activity.issue_title}"`,
      'update_issue': `actualizaste "${activity.issue_title}"`,
      'follow_user': `comenzaste a seguir a @${activity.details?.following_username || 'un usuario'}`,
      'unfollow_user': `dejaste de seguir a @${activity.details?.following_username || 'un usuario'}`,
      'sync_fork': `sincronizaste tu fork de "${activity.repo_name}"`,
      'create_forum_thread': `creaste un hilo en el foro`,
      'comment_forum': `comentaste en un hilo del foro`
    };
    return messages[activity.action] || `realizaste ${activity.action}`;
  };

  const formatTime = (dateString) => {
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
    <div className="space-y-3">
      {activities.slice(0, limit).map((activity) => (
        <div key={activity.id} className="text-sm">
          <div className="flex items-start gap-2">
            <span>{getIcon(activity.action)}</span>
            <div>
              <p className="text-gray-300">
                <span className="font-semibold text-white">Tú</span>{' '}
                {getMessage(activity)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{formatTime(activity.created_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityFeed;