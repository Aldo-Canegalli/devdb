import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/users/login', { email, password });
      
      // Llamar a la función onLogin que recibe como prop
      if (onLogin) {
        onLogin(response.data);
      } else {
        // Fallback: guardar en localStorage directamente
        localStorage.setItem('user', JSON.stringify(response.data));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 max-w-md">
      <div className="bg-[#132d46] rounded-xl p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#01c38e]">
          Iniciar Sesión
        </h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-white mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#01c38e]"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-3 rounded-lg transition"
          >
            Iniciar Sesión
          </button>
        </form>
        
        <p className="text-center text-gray-400 mt-4">
          ¿No tienes cuenta? <Link to="/register" className="text-[#01c38e] hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;