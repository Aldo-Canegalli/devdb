// frontend/src/components/OnlineFriends.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function OnlineFriends() {
  const [friends, setFriends] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllFollowing, setShowAllFollowing] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  const loadData = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      // Obtener amigos con actividad
      const friendsRes = await api.get(`/follows/${user.id}/friends-with-activity?limit=10`, {
        headers: { 'user-id': user.id }
      });
      setFriends(friendsRes.data);

      // Obtener seguidos
      const followingRes = await api.get(`/follows/${user.id}/following?limit=10`, {
        headers: { 'user-id': user.id }
      });
      setFollowing(followingRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Recargar cada 60 segundos
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700">
        <p className="text-gray-400 text-sm text-center">
          <Link to="/login" className="text-[#01c38e] hover:underline">Inicia sesión</Link> para ver tus amigos
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const displayedFriends = showAllFriends ? friends : friends.slice(0, 4);
  const displayedFollowing = showAllFollowing ? following : following.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Amigos */}
      <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-white">👥 Amigos ({friends.length})</h3>
          {friends.length > 4 && (
            <button
              onClick={() => setShowAllFriends(!showAllFriends)}
              className="text-xs text-[#01c38e] hover:text-emerald-400 transition"
            >
              {showAllFriends ? 'Ver menos' : 'Ver todos'}
            </button>
          )}
        </div>

        {friends.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">Aún no tienes amigos. Sigue a otros usuarios.</p>
        ) : (
          <div className="space-y-2">
            {displayedFriends.map((friend) => (
              <Link to={`/${friend.username}`} key={friend.id} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1e29] transition">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-[#1a1e29] flex-shrink-0">
                    {friend.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm truncate">{friend.username}</span>
                      {friend.has_new_repo && (
                        <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Nuevo repositorio"></span>
                      )}
                      {friend.new_repos_count > 1 && (
                        <span className="text-xs text-green-500">+{friend.new_repos_count}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {friend.has_new_repo ? '📁 Nuevo repo' : 'Amigo'}
                      </span>
                      {friend.new_repos_count > 0 && (
                        <span className="text-xs text-green-400">●</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Siguiendo */}
      <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-white">👤 Siguiendo ({following.length})</h3>
          {following.length > 4 && (
            <button
              onClick={() => setShowAllFollowing(!showAllFollowing)}
              className="text-xs text-[#01c38e] hover:text-emerald-400 transition"
            >
              {showAllFollowing ? 'Ver menos' : 'Ver todos'}
            </button>
          )}
        </div>

        {following.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">No sigues a nadie aún.</p>
        ) : (
          <div className="space-y-2">
            {displayedFollowing.map((user) => (
              <Link to={`/${user.username}`} key={user.id} className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1e29] transition">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-[#1a1e29] flex-shrink-0">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm truncate">{user.username}</span>
                    {user.follows_back && (
                      <span className="text-xs text-blue-400 ml-2">Amigo</span>
                    )}
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

export default OnlineFriends;