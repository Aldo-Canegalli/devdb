import { useState, useEffect } from 'react';
import api from '../api/axios';

function ForkButton({ repoId, repoName, onForkSuccess }) {
  const [hasForked, setHasForked] = useState(false);
  const [forkRepoId, setForkRepoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forking, setForking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [forkInfo, setForkInfo] = useState(null);
  const [message, setMessage] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!user.id;

  // Verificar si ya hizo fork
  const checkForkStatus = async () => {
    if (!isLoggedIn) return;
    
    try {
      const response = await api.get(`/forks/repositories/${repoId}/check`, {
        headers: { 'user-id': user.id }
      });
      setHasForked(response.data.hasForked);
      if (response.data.hasForked) {
        setForkRepoId(response.data.forkRepoId);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Obtener información del fork
  const loadForkInfo = async () => {
    if (!forkRepoId) return;
    
    try {
      const response = await api.get(`/forks/info/${forkRepoId}`);
      setForkInfo(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Crear fork
  const handleFork = async () => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    
    setForking(true);
    setMessage('');
    
    try {
      const response = await api.post(`/forks/repositories/${repoId}`, {}, {
        headers: { 'user-id': user.id }
      });
      
      if (response.data.forked) {
        setMessage(`✅ Repositorio forkeado correctamente`);
        setHasForked(true);
        setForkRepoId(response.data.repository.id);
        if (onForkSuccess) onForkSuccess();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`ℹ️ ${response.data.message}`);
        setHasForked(true);
        setForkRepoId(response.data.repository.id);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al crear fork'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setForking(false);
    }
  };

  // Sincronizar fork
  const handleSync = async () => {
    if (!forkRepoId) return;
    
    setSyncing(true);
    setMessage('');
    
    try {
      const response = await api.post(`/forks/repositories/${forkRepoId}/sync`, {}, {
        headers: { 'user-id': user.id }
      });
      
      setMessage(`✅ ${response.data.message}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Error al sincronizar'}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // Ver detalles del fork
  const handleShowInfo = async () => {
    if (showInfo) {
      setShowInfo(false);
    } else {
      await loadForkInfo();
      setShowInfo(true);
    }
  };

  useEffect(() => {
    checkForkStatus();
  }, [repoId, isLoggedIn]);

  useEffect(() => {
    if (forkRepoId) {
      loadForkInfo();
    }
  }, [forkRepoId]);

  if (!isLoggedIn) {
    return (
      <button
        onClick={handleFork}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition flex items-center gap-2"
      >
        🍴 Fork
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Botón principal */}
      <div className="flex gap-2">
        <button
          onClick={handleFork}
          disabled={forking}
          className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
            hasForked
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          } disabled:opacity-50`}
        >
          {forking ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Forkeando...
            </>
          ) : (
            <>
              🍴 {hasForked ? 'Forkeado' : 'Fork'}
            </>
          )}
        </button>
        
        {hasForked && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
              title="Sincronizar con el repositorio original"
            >
              {syncing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '🔄'
              )}
            </button>
            
            <button
              onClick={handleShowInfo}
              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg transition"
              title="Ver información del fork"
            >
              ℹ️
            </button>
          </>
        )}
      </div>
      
      {/* Mensaje temporal */}
      {message && (
        <div className="absolute top-full mt-2 left-0 bg-[#1a1e29] border border-[#01c38e] text-[#01c38e] p-2 rounded-lg text-sm whitespace-nowrap z-10">
          {message}
        </div>
      )}
      
      {/* Panel de información del fork */}
      {showInfo && forkInfo && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-[#132d46] rounded-xl border border-gray-700 p-4 z-20 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-white">Información del Fork</h4>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              <span className="text-gray-500">Original:</span>{' '}
              <span className="text-white">{forkInfo.original_name}</span>
              <br />
              <span className="text-xs text-gray-500">por @{forkInfo.original_owner}</span>
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">Tu fork:</span>{' '}
              <span className="text-white">{forkInfo.fork_name}</span>
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">Creado:</span>{' '}
              {new Date(forkInfo.created_at).toLocaleDateString()}
            </p>
            {forkInfo.last_synced_at && (
              <p className="text-gray-300">
                <span className="text-gray-500">Última sincronización:</span>{' '}
                {new Date(forkInfo.last_synced_at).toLocaleDateString()}
              </p>
            )}
            <p className="text-gray-300">
              <span className="text-gray-500">Sincronizaciones:</span>{' '}
              {forkInfo.synced_commits || 0}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700">
            <a
              href={`/repo/${forkRepoId}`}
              className="text-[#01c38e] hover:underline text-sm block text-center"
            >
              Ir a mi fork →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForkButton;