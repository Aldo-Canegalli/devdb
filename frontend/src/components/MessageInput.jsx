// frontend/src/components/MessageInput.jsx
import { useState } from 'react';

function MessageInput({ onSend, disabled }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-t border-gray-700 bg-[#1a1e29] rounded-b-xl">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={disabled ? 'Selecciona una conversación' : 'Escribe un mensaje...'}
        disabled={disabled || sending}
        className="flex-1 bg-[#132d46] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#01c38e] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled || sending}
        className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
      >
        {sending ? '...' : 'Enviar'}
      </button>
    </form>
  );
}

export default MessageInput;