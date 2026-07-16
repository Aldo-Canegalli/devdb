import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

function Activity() {
  const { userId } = useParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let url = '/activity/recent?limit=50';
    if (userId) {
      url = `/activity/users/${userId}/activity?limit=50`;
    }

    api.get(url)
      .then(response => {
        setActivities(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });

    if (userId) {
      api.get(`/users/${userId}`)
        .then(response => setUser(response.data))
        .catch(console.error);
    }
  }, [userId]);

  const getActivityIcon = (action) => {
    const icons = {
      'create_repo': '📁', 'upload_file': '📤', 'edit_file': '✏️',
      'delete_file': '🗑️', 'download_file': '⬇️', 'star_repo': '⭐',
      'unstar_repo': '☆', 'generate_token': '🔑', 'revoke_token': '🚫',
      'login': '🔓', 'register': '📝'
    };
    return icons[action] || '📌';
  };

  const getActivityMessage = (activity) => {
    const actions = {
      'create_repo': `creó "${activity.repo_name}"`,
      'upload_file': `subió "${activity.file_name}"`,
      'edit_file': `editó "${activity.file_name}"`,
      'delete_file': `eliminó "${activity.file_name}"`,
      'download_file': `descargó "${activity.file_name}"`,
      'star_repo': `marcó "${activity.repo_name}"`,
      'unstar_repo': `quitó estrella de "${activity.repo_name}"`,
      'generate_token': `generó un token`,
      'revoke_token': `revocó un token`,
      'login': `inició sesión`,
      'register': `se unió a DevDB`
    };
    return actions[activity.action] || activity.action;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-PE');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando actividad...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-2">
        {userId ? `Actividad de @${user?.username || 'usuario'}` : 'Actividad Global'}
      </h1>
      <p className="text-gray-400 mb-8">Historial de acciones en DevDB</p>

      {activities.length === 0 ? (
        <div className="bg-[#132d46] rounded-xl p-12 text-center border border-gray-700">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-gray-400">No hay actividad registrada aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getActivityIcon(activity.action)}</div>
                <div className="flex-1">
                  <p className="text-white">
                    <span className="font-bold text-[#01c38e]">@{activity.user_name}</span>{' '}
                    {getActivityMessage(activity)}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-gray-500 mt-1">
                      {JSON.stringify(activity.details)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">{formatDate(activity.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Activity;