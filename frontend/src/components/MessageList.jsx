// frontend/src/components/MessageList.jsx
import { useEffect, useRef } from 'react';

function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Si el mensaje es de hoy, mostrar la hora
    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si es de ayer
    if (diffDays === 1) {
      return 'ayer ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si es de hace menos de 7 días, mostrar el día de la semana
    if (diffDays < 7) {
      const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      return days[date.getDay()] + ' ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Para mensajes más antiguos, mostrar fecha completa
    return date.toLocaleDateString('es-PE') + ' ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 min-h-[200px]">
        <p>No hay mensajes aún. ¡Envía el primero!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] min-h-[200px]">
      {messages.map((message) => {
        const isMine = message.sender_id === currentUserId;
        return (
          <div
            key={message.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-xl px-4 py-2 ${
                isMine
                  ? 'bg-[#01c38e] text-[#1a1e29]'
                  : 'bg-[#1a1e29] text-white'
              }`}
            >
              {!isMine && (
                <p className="text-xs font-semibold text-[#01c38e] mb-1">
                  @{message.sender_name}
                </p>
              )}
              <p className="text-sm break-words">{message.content}</p>
              <p className={`text-xs mt-1 ${isMine ? 'text-[#1a1e29]/70' : 'text-gray-500'}`}>
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;