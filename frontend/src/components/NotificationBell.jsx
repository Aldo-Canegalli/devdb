import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  // Cargar notificaciones
  const loadNotifications = async () => {
    if (!isLoggedIn) return;
    
    setLoading(true);
    try {
      const response = await api.get('/notifications', {
        headers: { 'user-id': user.id },
        params: { limit: 20 }
      });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar contador de no leídas
  const updateUnreadCount = async () => {
    if (!isLoggedIn) return;
    
    try {
      const response = await api.get('/notifications/unread-count', {
        headers: { 'user-id': user.id }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Marcar notificación como leída
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {}, {
        headers: { 'user-id': user.id }
      });
      
      // Actualizar lista
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {}, {
        headers: { 'user-id': user.id }
      });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar notificaciones al montar y cada 30 segundos
  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
      const interval = setInterval(updateUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Recargar al abrir el dropdown
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const getTypeIcon = (type) => {
    const icons = {
      'estrella': '⭐',
      'fork': '🍴',
      'comentario': '💬',
      'solicitud_fusion': '🔀',
      'incidencia': '🐛',
      'invitacion': '👥',
      'mencion': '📌',
      'seguidor': '👤',      
      'nuevo_repo': '📁',
      'mensaje': '💬'    
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

  if (!isLoggedIn) {
    return (
      <Link to="/login" className="text-gray-400 hover:text-white transition relative">
        🔔
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-300 hover:text-white transition p-1"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[#132d46] rounded-xl border border-gray-700 shadow-2xl z-50 max-h-[500px] overflow-hidden">
          {/* Header del dropdown */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#1a1e29]">
            <h3 className="font-bold text-white">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#01c38e] hover:text-emerald-400 transition"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-2 text-sm">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl mb-2 block">📭</span>
                <p className="text-gray-400 text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#1a1e29] transition cursor-pointer ${
                      !notification.is_read ? 'bg-[#1a1e29]/50 border-l-4 border-[#01c38e]' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getTypeColor(notification.type)}`}>
                            {notification.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 break-words">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-[#01c38e] rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer del dropdown */}
          <div className="p-3 border-t border-gray-700 bg-[#1a1e29] text-center">
            <Link 
              to="/notificaciones" 
              className="text-sm text-[#01c38e] hover:text-emerald-400 transition"
              onClick={() => setIsOpen(false)}
            >
              Ver todas las notificaciones →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;