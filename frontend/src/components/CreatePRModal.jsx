// frontend/src/components/CreatePRModal.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';

function CreatePRModal({ isOpen, onClose, repoId, repoName, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromRepoId, setFromRepoId] = useState('');
  const [forks, setForks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

const loadForks = async () => {
  try {
    // Obtener todos los forks del repositorio
    const response = await api.get(`/forks/repositories/${repoId}`, {
      headers: { 'user-id': user.id }
    });
    
    // Filtrar solo los forks del usuario logueado
    const userForks = response.data.filter(
      fork => fork.forked_by === user.id
    );
    
    setForks(userForks);
  } catch (error) {
    console.error('Error:', error);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/pull-requests', {
        title,
        description,
        fromRepoId: parseInt(fromRepoId),
        toRepoId: parseInt(repoId)
      }, {
        headers: { 'user-id': user.id }
      });

      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al crear Pull Request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadForks();
      setTitle('');
      setDescription('');
      setFromRepoId('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#132d46] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">🔀 Crear Pull Request</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <p className="text-gray-400 text-sm mb-4">
            Creando PR para <span className="text-white font-semibold">{repoName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Repositorio origen (fork)</label>
              <select
                value={fromRepoId}
                onChange={(e) => setFromRepoId(e.target.value)}
                className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                required
              >
                <option value="">Selecciona un fork</option>
                {forks.map((fork) => (
                  <option key={fork.id} value={fork.forked_repo_id}>
                    {fork.forked_repo_name} (@{fork.forked_by_username})
                  </option>
                ))}
              </select>
              {forks.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No tienes forks de este repositorio. Haz un fork primero.
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Breve descripción de los cambios"
                className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica los cambios realizados..."
                className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
                rows="5"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={loading || forks.length === 0}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Pull Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreatePRModal;