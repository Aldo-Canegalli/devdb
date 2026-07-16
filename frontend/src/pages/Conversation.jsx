import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';

function Conversation() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Función para actualizar el contador de mensajes no leídos en el header
  const updateUnreadCount = async () => {
    try {
      const response = await api.get('/messages/unread-count', {
        headers: { 'user-id': user.id }
      });
      // Disparar un evento personalizado para actualizar el header
      window.dispatchEvent(new CustomEvent('updateUnreadCount', { 
        detail: { count: response.data.count } 
      }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadConversation = async () => {
    try {
      const response = await api.get(`/conversations/${userId}`, {
        headers: { 'user-id': user.id }
      });
      setConversation(response.data.conversation);
      setMessages(response.data.messages);
      
      // Actualizar el contador de mensajes no leídos después de marcar como leídos
      await updateUnreadCount();
      
      // Obtener información del otro usuario
      try {
        const userResponse = await api.get(`/users/id/${userId}`);
        setOtherUser(userResponse.data.user);
      } catch (userError) {
        console.error('Error obteniendo usuario:', userError);
        // Si falla, intentar obtener de la conversación
        if (response.data.conversation) {
          setOtherUser({ id: parseInt(userId), username: `usuario_${userId}` });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        navigate('/mensajes');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content) => {
    try {
      const response = await api.post('/messages', {
        receiverId: userId,
        content
      }, {
        headers: { 'user-id': user.id }
      });
      
      setMessages(prev => [...prev, {
        ...response.data.data,
        sender_name: user.username
      }]);

      // Actualizar el contador por si el receptor ve el mensaje
      await updateUnreadCount();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user.id) {
      loadConversation();
      // Recargar cada 10 segundos para ver nuevos mensajes
      const interval = setInterval(loadConversation, 10000);
      return () => clearInterval(interval);
    }
  }, [userId, user.id]);

  if (!user.id) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">💬</span>
          <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión para chatear</h2>
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
        <p className="text-gray-400 mt-4">Cargando conversación...</p>
      </div>
    );
  }

  // Si no hay otro usuario, mostrar el ID como nombre
  const displayName = otherUser?.username || `Usuario ${userId}`;

  return (
    <div className="container mx-auto px-6 py-16 max-w-3xl">
      <Link to="/mensajes" className="text-[#01c38e] hover:text-emerald-400 transition text-sm mb-4 inline-block">
        ← Volver a mensajes
      </Link>

      <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
        {/* Header de la conversación */}
        <div className="p-4 border-b border-gray-700 bg-[#1a1e29] flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#01c38e] to-emerald-600 rounded-full flex items-center justify-center text-sm font-bold text-[#1a1e29]">
            {displayName?.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-white">@{displayName}</span>
        </div>

        {/* Mensajes */}
        <MessageList messages={messages} currentUserId={user.id} />

        {/* Input */}
        <MessageInput onSend={sendMessage} disabled={!conversation} />
      </div>
    </div>
  );
}

export default Conversation;