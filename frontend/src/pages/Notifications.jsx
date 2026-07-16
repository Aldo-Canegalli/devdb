import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadNotifications = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/notifications', {
        headers: { 'user-id': user.id },
        params: { 
          limit: 100,
          unreadOnly: filter === 'unread'
        }
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {}, {
        headers: { 'user-id': user.id }
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {}, {
        headers: { 'user-id': user.id }
      });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`, {
        headers: { 'user-id': user.id }
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'estrella': '⭐',
      'fork': '🍴',
      'comentario': '💬',
      'solicitud_fusion': '🔀',
      'incidencia': '🐛',
      'invitacion': '👥',
      'mencion': '📌'
    };
    return icons[type] || '🔔';
  };

  const getTypeColor = (type) => {
    const colors = {
      'estrella': 'text-yellow-400',
      'fork': 'text-purple-400',
      'comentario': 'text-blue-400',
      'solicitud_fusion': 'text-green-400',
      'incidencia': 'text-red-400',
      'invitacion': 'text-indigo-400',
      'mencion': 'text-pink-400'
    };
    return colors[type] || 'text-gray-400';
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

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔔</span>
          <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión para ver tus notificaciones</h2>
          <Link to="/login" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto px-6 py-16 max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
          <p className="text-gray-400 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} no leídas` : 'Todas las notificaciones están leídas'}
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
          >
            <option value="all">Todas</option>
            <option value="unread">No leídas</option>
          </select>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-4">Cargando notificaciones...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-[#132d46] rounded-2xl p-12 text-center border border-gray-700">
          <span className="text-6xl mb-4 block">📭</span>
          <h2 className="text-2xl font-bold text-white mb-2">No hay notificaciones</h2>
          <p className="text-gray-400">Aún no tienes actividad que mostrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-[#132d46] rounded-xl p-4 border ${
                !notification.is_read ? 'border-[#01c38e]' : 'border-gray-700'
              } hover:border-[#01c38e] transition group`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-1">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${getTypeColor(notification.type)}`}>
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <span className="text-xs bg-[#01c38e] text-[#1a1e29] px-2 py-0.5 rounded-full">
                        Nuevo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 mt-1">{notification.message}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(notification.created_at)}
                    </span>
                    {notification.actor_username && (
                      <span className="text-xs text-gray-500">
                        👤 @{notification.actor_username}
                      </span>
                    )}
                    {notification.repo_name && (
                      <span className="text-xs text-gray-500">
                        📁 {notification.repo_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs text-[#01c38e] hover:text-emerald-400 transition"
                    >
                      Marcar leída
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;