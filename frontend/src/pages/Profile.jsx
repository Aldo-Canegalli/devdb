import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import FollowButton from '../components/FollowButton';

function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwnProfile = user.username === username;

  const loadProfile = async () => {
    setLoading(true);
    try {
      const config = user?.id ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(`/users/${username}`, config);
      setProfile(response.data);
      setBio(response.data.user.bio || '');
      setFollowersCount(response.data.followersCount || 0);
      setFollowingCount(response.data.followingCount || 0);
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/activity`);
      setProfile(prev => ({ ...prev, activity: response.data }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      await api.put('/users/profile', { bio }, {
        headers: { 'user-id': user.id }
      });
      
      setMessage('✅ Perfil actualizado correctamente');
      setEditing(false);
      loadProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al actualizar'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getActivityIcon = (action) => {
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
      'login': '🔓',
      'register': '📝',
      'follow_user': '👥',
      'unfollow_user': '🚫'
    };
    return icons[action] || '📌';
  };

  const getActivityMessage = (activity) => {
    const actions = {
      'create_repo': `creó el repositorio "${activity.repo_name}"`,
      'upload_file': `subió el archivo "${activity.file_name}"`,
      'edit_file': `editó el archivo "${activity.file_name}"`,
      'delete_file': `eliminó el archivo "${activity.file_name}"`,
      'download_file': `descargó el archivo "${activity.file_name}"`,
      'star_repo': `marcó con estrella "${activity.repo_name}"`,
      'unstar_repo': `quitó la estrella de "${activity.repo_name}"`,
      'generate_token': `generó un token de acceso`,
      'revoke_token': `revocó un token de acceso`,
      'fork_repository': `hizo fork de "${activity.repo_name}"`,
      'create_issue': `creó una incidencia en "${activity.repo_name}"`,
      'login': `inició sesión`,
      'register': `se unió a DevDB`,
      'follow_user': `comenzó a seguir a @${activity.details?.following_username || 'un usuario'}`,
      'unfollow_user': `dejó de seguir a @${activity.details?.following_username || 'un usuario'}`
    };
    return actions[activity.action] || `realizó ${activity.action}`;
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  useEffect(() => {
    if (profile?.user?.id) {
      loadActivity(profile.user.id);
    }
  }, [profile?.user?.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando perfil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-bold text-white mb-2">Usuario no encontrado</h2>
          <p className="text-gray-400 mb-6">El usuario que buscas no existe.</p>
          <Link to="/" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { user: userData, stats, repositories } = profile;

  return (
    <div className="container mx-auto px-6 py-16 max-w-5xl">
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center mb-6">
          {message}
        </div>
      )}

      {/* Cabecera del perfil */}
      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-4xl font-bold text-[#1a1e29] flex-shrink-0">
            {userData.username?.charAt(0).toUpperCase()}
          </div>
          
          {/* Información */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                @{userData.username}
              </h1>
              {isOwnProfile && (
                <button
                  onClick={() => setEditing(!editing)}
                  className="text-sm text-[#01c38e] hover:text-emerald-400 transition"
                >
                  {editing ? 'Cancelar' : '✏️ Editar perfil'}
                </button>
              )}
              {!isOwnProfile && user.id && (
                <>
                  <FollowButton userId={userData.id} onFollowChange={loadProfile} />
                  <Link
                    to={`/mensajes/${userData.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Enviar mensaje
                  </Link>
                </>
              )}
            </div>
            
            {isOwnProfile && editing ? (
              <form onSubmit={handleUpdateProfile} className="mt-3">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escribe tu biografía..."
                  className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                  rows="3"
                />
                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-400 mt-2 max-w-lg">
                {userData.bio || (isOwnProfile ? 'Agrega una biografía para contar quién eres.' : 'Este usuario aún no tiene biografía.')}
              </p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-3">
              <span>📅 Se unió el {new Date(userData.created_at).toLocaleDateString()}</span>
              {isOwnProfile && (
                <span className="text-[#01c38e]">👤 Este es tu perfil</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas clickeables */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Repositorios - solo públicos */}
          <Link 
            to={`/buscar?user=${userData.username}`}
            className="bg-[#1a1e29] rounded-xl p-4 text-center border border-gray-700 hover:border-[#01c38e] transition hover:scale-105"
          >
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_repos || 0}</div>
            <div className="text-xs text-gray-400">Repositorios públicos</div>
          </Link>
          
          {/* Estrellas recibidas */}
          <div className="bg-[#1a1e29] rounded-xl p-4 text-center border border-gray-700">
            <div className="text-2xl font-bold text-[#01c38e]">{stats.total_stars_received || 0}</div>
            <div className="text-xs text-gray-400">Estrellas recibidas</div>
          </div>
          
          {/* Seguidores */}
          <Link 
            to={`/friends/${userData.id}?tab=followers`}
            className="bg-[#1a1e29] rounded-xl p-4 text-center border border-gray-700 hover:border-[#01c38e] transition hover:scale-105"
          >
            <div className="text-2xl font-bold text-[#01c38e]">{followersCount}</div>
            <div className="text-xs text-gray-400">Seguidores</div>
          </Link>
          
          {/* Siguiendo */}
          <Link 
            to={`/friends/${userData.id}?tab=following`}
            className="bg-[#1a1e29] rounded-xl p-4 text-center border border-gray-700 hover:border-[#01c38e] transition hover:scale-105"
          >
            <div className="text-2xl font-bold text-[#01c38e]">{followingCount}</div>
            <div className="text-xs text-gray-400">Siguiendo</div>
          </Link>
        </div>
      </div>

      {/* Repositorios del usuario */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">📁 Repositorios de {userData.username}</h2>
        {repositories.length === 0 ? (
          <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
            <p className="text-gray-400">
              {isOwnProfile 
                ? 'Aún no has creado repositorios públicos.' 
                : `${userData.username} aún no tiene repositorios públicos.`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <Link to={`/repo/${repo.id}`} key={repo.id}>
                <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition group">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {repo.repo_type === 'game' ? '🎮' : repo.repo_type === 'code' ? '💻' : '📚'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-[#01c38e] transition">
                        {repo.name}
                      </h4>
                      <p className="text-sm text-gray-400 truncate">
                        {repo.description || 'Sin descripción'}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>⭐ {repo.stars_count || 0}</span>
                        <span>🍴 {repo.forks_count || 0}</span>
                        <span>📅 {new Date(repo.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Actividad reciente */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">📊 Actividad reciente</h2>
        <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
            {profile.activity && profile.activity.length > 0 ? (
              profile.activity.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-[#1a1e29] transition">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">{getActivityIcon(activity.action)}</div>
                    <div>
                      <p className="text-gray-300">
                        <span className="font-semibold text-white">@{activity.user_name}</span>{' '}
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p>No hay actividad reciente para mostrar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;