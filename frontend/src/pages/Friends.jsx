import { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import api from '../api/axios';

function Friends() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'friends';
  
  const [friends, setFriends] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [targetUser, setTargetUser] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;
  
  const targetUserId = userId || user.id;
  const isOwnProfile = !userId || parseInt(userId) === user.id;

  const loadUserInfo = async () => {
    try {
      const response = await api.get(`/users/id/${targetUserId}`);
      setTargetUser(response.data.user);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadData = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      const [friendsRes, followingRes, followersRes] = await Promise.all([
        api.get(`/follows/${targetUserId}/friends`, { headers: { 'user-id': user.id } }),
        api.get(`/follows/${targetUserId}/following`, { headers: { 'user-id': user.id } }),
        api.get(`/follows/${targetUserId}/followers`, { headers: { 'user-id': user.id } })
      ]);
      setFriends(friendsRes.data);
      setFollowing(followingRes.data);
      setFollowers(followersRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && targetUserId) {
      loadUserInfo();
      loadData();
    } else if (!isLoggedIn) {
      setLoading(false);
    }
  }, [targetUserId, isLoggedIn]);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'friends';
    setActiveTab(tab);
  }, [searchParams]);

  const renderList = (items, title, emptyMessage) => {
    if (items.length === 0) {
      return (
        <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Link to={`/${item.username}`} key={item.id}>
            <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-lg font-bold text-[#1a1e29] flex-shrink-0">
                  {item.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">@{item.username}</span>
                    {(item.follows_back || item.is_following_back) && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Amigo</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{item.bio || 'Sin biografía'}</p>
                  <p className="text-xs text-gray-500">
                    {item.friend_since 
                      ? `Amigo desde ${new Date(item.friend_since).toLocaleDateString()}`
                      : item.followed_since 
                        ? `Siguiendo desde ${new Date(item.followed_since).toLocaleDateString()}`
                        : ''}
                  </p>
                </div>
                <div className="text-[#01c38e] text-sm flex items-center gap-1">
                  Ver perfil →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const getTabTitle = () => {
    const displayName = targetUser?.username || 'usuario';
    switch(activeTab) {
      case 'friends': return `Amigos de @${displayName} (${friends.length})`;
      case 'following': return `Siguiendo de @${displayName} (${following.length})`;
      case 'followers': return `Seguidores de @${displayName} (${followers.length})`;
      default: return 'Amigos';
    }
  };

  const getEmptyMessage = () => {
    const displayName = targetUser?.username || 'este usuario';
    switch(activeTab) {
      case 'friends': return `@${displayName} no tiene amigos aún.`;
      case 'following': return `@${displayName} no sigue a nadie aún.`;
      case 'followers': return `@${displayName} no tiene seguidores aún.`;
      default: return 'No hay elementos para mostrar.';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">👥</span>
          <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión para ver amigos</h2>
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
        <p className="text-gray-400 mt-4">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-8">
        👥 {targetUser ? `Amigos de @${targetUser.username}` : 'Amigos y seguidores'}
      </h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-700 mb-6">
        <Link
          to={userId ? `/friends/${userId}?tab=friends` : '/friends?tab=friends'}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'friends' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Amigos ({friends.length})
        </Link>
        <Link
          to={userId ? `/friends/${userId}?tab=following` : '/friends?tab=following'}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'following' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Siguiendo ({following.length})
        </Link>
        <Link
          to={userId ? `/friends/${userId}?tab=followers` : '/friends?tab=followers'}
          className={`px-4 py-2 font-bold transition ${
            activeTab === 'followers' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Seguidores ({followers.length})
        </Link>
        {!isOwnProfile && (
          <Link
            to={`/${targetUser?.username}`}
            className="px-4 py-2 text-sm text-gray-400 hover:text-[#01c38e] transition ml-auto"
          >
            Volver al perfil →
          </Link>
        )}
      </div>

      <div>
        {activeTab === 'friends' && renderList(friends, 'Amigos', getEmptyMessage())}
        {activeTab === 'following' && renderList(following, 'Siguiendo', getEmptyMessage())}
        {activeTab === 'followers' && renderList(followers, 'Seguidores', getEmptyMessage())}
      </div>
    </div>
  );
}

export default Friends;