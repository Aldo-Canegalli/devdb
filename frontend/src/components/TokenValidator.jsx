import { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

function TokenValidator() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleValidate = async () => {
    if (!token) {
      setError('Ingresa un token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/validate-token', { token });
      
      if (response.data.success) {
        // Redirigir al repositorio
        navigate(`/repo/${response.data.repository.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Token inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">🔑 Acceder con token</h3>
      <div className="flex gap-3">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="devdb_xxxxxxxxxxxxxxxx"
          className="flex-1 bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
        />
        <button
          onClick={handleValidate}
          disabled={loading}
          className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 rounded-lg transition disabled:opacity-50"
        >
          {loading ? '...' : 'Acceder'}
        </button>
      </div>
      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
    </div>
  );
}

export default TokenValidator;