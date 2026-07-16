// frontend/src/pages/Messages.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFriends, setShowFriends] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadConversations = async () => {
    try {
      const response = await api.get('/conversations', {
        headers: { 'user-id': user.id }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await api.get(`/follows/${user.id}/friends`, {
        headers: { 'user-id': user.id }
      });
      setFriends(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user.id) {
      Promise.all([loadConversations(), loadFriends()]).finally(() => {
        setLoading(false);
      });
      const interval = setInterval(loadConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [user.id]);

  if (!user.id) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">💬</span>
          <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión para ver tus mensajes</h2>
          <Link to="/login" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando mensajes...</p>
      </div>
    );
  }

  // Si no hay conversaciones pero hay amigos, mostrar amigos
  const hasConversations = conversations.length > 0;
  const hasFriends = friends.length > 0;

  if (!hasConversations && !hasFriends) {
    return (
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">💬 Mensajes</h1>
        <div className="bg-[#132d46] rounded-2xl p-12 text-center border border-gray-700">
          <span className="text-6xl mb-4 block">📭</span>
          <h2 className="text-2xl font-bold text-white mb-2">No tienes conversaciones ni amigos</h2>
          <p className="text-gray-400">Visita el perfil de un usuario y envíale un mensaje o síguelo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-8">💬 Mensajes</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 mb-6">
        <button
          onClick={() => setShowFriends(false)}
          className={`px-4 py-2 font-bold transition ${
            !showFriends ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Conversaciones ({conversations.length})
        </button>
        <button
          onClick={() => setShowFriends(true)}
          className={`px-4 py-2 font-bold transition ${
            showFriends ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Amigos ({friends.length})
        </button>
      </div>

      {/* Conversaciones */}
      {!showFriends && (
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
              <p className="text-gray-400">No tienes conversaciones aún.</p>
              <p className="text-sm text-gray-500 mt-1">Ve a la pestaña "Amigos" para iniciar una.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link to={`/mensajes/${conv.other_user_id}`} key={conv.id}>
                <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-lg font-bold text-[#1a1e29] flex-shrink-0">
                      {conv.other_user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">@{conv.other_user_name}</span>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#01c38e] text-[#1a1e29] text-xs font-bold px-2 py-0.5 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {conv.last_message || 'Sin mensajes'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Amigos */}
      {showFriends && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
              <p className="text-gray-400">No tienes amigos aún.</p>
              <p className="text-sm text-gray-500 mt-1">Sigue a otros usuarios para que sean tus amigos.</p>
            </div>
          ) : (
            friends.map((friend) => (
              <Link to={`/mensajes/${friend.id}`} key={friend.id}>
                <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-lg font-bold text-[#1a1e29] flex-shrink-0">
                      {friend.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-white">@{friend.username}</span>
                      <p className="text-sm text-gray-400">
                        {friend.bio || 'Sin biografía'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Amigo desde {new Date(friend.friend_since).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-[#01c38e] text-sm">
                      Enviar mensaje →
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Messages;