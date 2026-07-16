import { useState, useEffect } from 'react';
import api from '../api/axios';

function CollaboratorsList({ repoId, isOwner }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('reader');
  const [message, setMessage] = useState('');

  const loadCollaborators = () => {
    api.get(`/collaborators/repositories/${repoId}`)
      .then(response => {
        setCollaborators(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });
  };

  const handleInvite = async (e) => {
  e.preventDefault();
  if (!username.trim()) return;

  setInviting(true);
  setMessage('');

  // Obtener el usuario logueado del localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    await api.post(`/collaborators/repositories/${repoId}/invite`, {
      username,
      role
    }, {
      headers: { 'user-id': user.id }
    });
    setMessage(`✅ ${username} ha sido invitado como ${getRoleName(role)}`);
    setUsername('');
    loadCollaborators();
  } catch (error) {
    setMessage(`❌ ${error.response?.data?.error || 'Error al invitar'}`);
  } finally {
    setInviting(false);
    setTimeout(() => setMessage(''), 3000);
  }
};

const handleRemove = async (userId) => {
  if (!confirm('¿Eliminar este colaborador?')) return;

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    await api.delete(`/collaborators/repositories/${repoId}/collaborators/${userId}`, {
      headers: { 'user-id': user.id }
    });
    setMessage('✅ Colaborador eliminado');
    loadCollaborators();
    setTimeout(() => setMessage(''), 2000);
  } catch (error) {
    setMessage('❌ Error al eliminar');
  }
};

const handleChangeRole = async (userId, newRole) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    await api.put(`/collaborators/repositories/${repoId}/collaborators/${userId}`, {
      role: newRole
    }, {
      headers: { 'user-id': user.id }
    });
    setMessage(`✅ Rol actualizado a ${getRoleName(newRole)}`);
    loadCollaborators();
    setTimeout(() => setMessage(''), 2000);
  } catch (error) {
    setMessage('❌ Error al actualizar rol');
  }
};

  const getRoleName = (role) => {
    const roles = {
      'owner': '👑 Dueño',
      'maintainer': '🛠️ Mantenedor',
      'writer': '✍️ Editor',
      'reader': '👁️ Lector',
      'tester': '🐛 Probador'
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'owner': 'text-yellow-400',
      'maintainer': 'text-blue-400',
      'writer': 'text-green-400',
      'reader': 'text-gray-400',
      'tester': 'text-purple-400'
    };
    return colors[role] || 'text-gray-400';
  };

  useEffect(() => {
    loadCollaborators();
  }, [repoId]);

  if (loading) {
    return (
      <div className="bg-[#132d46] rounded-xl p-6 text-center">
        <p className="text-gray-400">Cargando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg text-center">
          {message}
        </div>
      )}

      {isOwner && (
        <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">👥 Invitar colaborador</h3>
          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              className="flex-1 bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
            >
              <option value="maintainer">🛠️ Mantenedor</option>
              <option value="writer">✍️ Editor</option>
              <option value="reader">👁️ Lector</option>
              <option value="tester">🐛 Probador</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {inviting ? 'Invitar...' : 'Invitar'}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Los colaboradores recibirán acceso según su rol.
          </p>
        </div>
      )}

      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
          <h3 className="font-bold text-white">
            Colaboradores ({collaborators.length})
          </h3>
        </div>
        
        {collaborators.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay colaboradores en este repositorio</p>
            {isOwner && <p className="text-sm mt-1">Invita a otros usuarios para colaborar</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {collaborators.map((collab) => (
              <div key={collab.id} className="p-4 flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#01c38e]/20 rounded-full flex items-center justify-center text-xl">
                    {collab.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">@{collab.username}</p>
                    <p className={`text-sm ${getRoleColor(collab.role)}`}>
                      {getRoleName(collab.role)}
                    </p>
                    {collab.accepted_at ? (
                      <p className="text-xs text-green-400">✓ Aceptado</p>
                    ) : (
                      <p className="text-xs text-yellow-400">⏳ Pendiente</p>
                    )}
                  </div>
                </div>
                
                {isOwner && collab.role !== 'owner' && (
                  <div className="flex gap-2">
                    <select
                      value={collab.role}
                      onChange={(e) => handleChangeRole(collab.user_id, e.target.value)}
                      className="bg-[#1a1e29] border border-gray-700 rounded-lg p-1 text-sm text-white"
                    >
                      <option value="maintainer">Mantenedor</option>
                      <option value="writer">Editor</option>
                      <option value="reader">Lector</option>
                      <option value="tester">Probador</option>
                    </select>
                    <button
                      onClick={() => handleRemove(collab.user_id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#132d46] rounded-xl p-4 border border-gray-700">
        <h4 className="text-sm font-bold text-white mb-2">📋 Permisos por rol</h4>
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between"><span>👑 Dueño:</span><span>Todos los permisos</span></div>
          <div className="flex justify-between"><span>🛠️ Mantenedor:</span><span>Administrar, editar, subir</span></div>
          <div className="flex justify-between"><span>✍️ Editor:</span><span>Editar y subir archivos</span></div>
          <div className="flex justify-between"><span>👁️ Lector:</span><span>Solo ver y descargar</span></div>
          <div className="flex justify-between"><span>🐛 Probador:</span><span>Ver y reportar errores</span></div>
        </div>
      </div>
    </div>
  );
}

export default CollaboratorsList;