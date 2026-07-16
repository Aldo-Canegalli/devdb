// frontend/src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import NotificationBell from './NotificationBell'
import SearchBar from './SearchBar'
import api from '../api/axios'

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await api.get('/messages/unread-count', {
        headers: { 'user-id': user.id }
      });
      setUnreadMessages(response.data.count);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Escuchar eventos de actualización del contador
  useEffect(() => {
    const handleUpdateUnread = (event) => {
      setUnreadMessages(event.detail.count);
    };
    
    window.addEventListener('updateUnreadCount', handleUpdateUnread);
    
    return () => {
      window.removeEventListener('updateUnreadCount', handleUpdateUnread);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <header className="bg-[#132d46] border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-[#01c38e] rounded-lg flex items-center justify-center">
              <span className="text-[#1a1e29] font-bold text-xl">&lt;/&gt;</span>
            </div>
            <span className="text-2xl font-bold text-white hidden sm:inline">
              DevDB
            </span>
          </Link>

          {/* Navegación */}
<nav className="hidden md:flex gap-6 ml-6">
  <Link to="/store" className="text-gray-300 hover:text-[#01c38e] transition hover-lift">Tienda</Link>
  <Link to="/library" className="text-gray-300 hover:text-[#01c38e] transition hover-lift">Biblioteca</Link>
  <Link to="/community" className="text-gray-300 hover:text-[#01c38e] transition hover-lift">Comunidad</Link>
  <Link to="/friends" className="text-gray-300 hover:text-[#01c38e] transition hover-lift">Amigos</Link>
  <Link to="/dashboard" className="text-gray-300 hover:text-[#01c38e] transition hover-lift">Estadisticas</Link>
</nav>

          {/* Buscador */}
          <div className="flex-1 max-w-md hidden lg:block mx-4">
            <SearchBar />
          </div>

          {/* Botones */}
          <div className="flex gap-3 items-center flex-shrink-0">
            {user ? (
              <div className="flex gap-3 items-center">
                <NotificationBell />
                
                {/* Mensajes */}
                <Link to="/mensajes" className="text-gray-300 hover:text-[#01c38e] transition relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Botón Crear */}
                <Link to="/create" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition flex items-center gap-2">
                  <span className="text-lg font-bold">+</span> 
                  <span className="hidden sm:inline">Crear</span>
                </Link>

                {/* Perfil del usuario */}
                <Link 
                  to={`/${user.username}`} 
                  className="flex items-center gap-2 bg-[#1a1e29] px-3 py-2 rounded-lg hover:bg-[#132d46] transition border border-transparent hover:border-[#01c38e]"
                >
                  <div className="w-6 h-6 bg-[#01c38e] rounded-full flex items-center justify-center text-xs text-[#1a1e29] font-bold">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm hidden md:inline">{user.username}</span>
                </Link>

                {/* Botón Salir */}
                <button 
                  onClick={onLogout} 
                  className="text-gray-400 hover:text-red-400 transition text-sm"
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="border border-[#01c38e] text-[#01c38e] hover:bg-[#01c38e] hover:text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition">
                  Iniciar
                </Link>
                <Link to="/register" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition">
                  Registro
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Buscador móvil */}
        <div className="mt-3 lg:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}

export default Header