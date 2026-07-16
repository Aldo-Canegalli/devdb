import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchBar({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar repositorios por nombre, descripción..."
        className="flex-1 bg-[#1a1e29] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#01c38e] transition"
      />
      <button
        type="submit"
        className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-6 py-3 rounded-lg transition flex items-center gap-2"
      >
        🔍 Buscar
      </button>
    </form>
  );
}

export default SearchBar;