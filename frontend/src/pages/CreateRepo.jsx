import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import TagSelector from '../components/TagSelector';

function CreateRepo() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoType, setRepoType] = useState('code');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user.id) {
      setError('Debes iniciar sesión primero');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/repositories', {
        name,
        description,
        repo_type: repoType,
        visibility,
        tags
      }, {
        headers: { 'user-id': user.id }
      });

      navigate(`/repo/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear repositorio');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 max-w-2xl">
      <div className="bg-[#132d46] rounded-xl p-8 border border-gray-700">
        <h1 className="text-3xl font-bold mb-8 text-white">
          Crear nuevo repositorio
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Nombre del proyecto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              placeholder="ej: mi-proyecto-awesome"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              rows="4"
              placeholder="Describe tu proyecto..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Etiquetas</label>
            <TagSelector
              selectedTags={tags}
              onChange={setTags}
              placeholder="Ej: javascript, react, juego..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Escribe y presiona Enter para agregar. Puedes crear nuevas etiquetas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 mb-2">Tipo de contenido</label>
              <select
                value={repoType}
                onChange={(e) => setRepoType(e.target.value)}
                className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              >
                <option value="game">🎮 Juego</option>
                <option value="code">💻 Código</option>
                <option value="txt">📚 Texto/Documentación</option>
                <option value="mixed">🔀 Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Visibilidad</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              >
                <option value="public">🌍 Público - Visible para todos</option>
                <option value="private">🔒 Privado - Solo para mí</option>
                <option value="unlisted">🔗 Oculto - Solo con link</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 text-lg"
          >
            {loading ? 'Creando repositorio...' : '🚀 Crear repositorio'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateRepo;