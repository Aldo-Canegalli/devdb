import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

function TagSelector({ selectedTags = [], onChange, placeholder = 'Agregar etiquetas...' }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Cargar todas las etiquetas al inicio
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await api.get('/tags');
        setAllTags(response.data);
      } catch (error) {
        console.error('Error al cargar etiquetas:', error);
      }
    };
    loadTags();
  }, []);

  // Buscar etiquetas mientras escribe
  useEffect(() => {
    const searchTags = async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(`/tags/search?q=${encodeURIComponent(inputValue.trim())}`);
        // Filtrar etiquetas que ya están seleccionadas
        const filtered = response.data.filter(
          tag => !selectedTags.some(t => t.toLowerCase() === tag.name.toLowerCase())
        );
        setSuggestions(filtered);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchTags, 300);
    return () => clearTimeout(debounce);
  }, [inputValue, selectedTags]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Agregar etiqueta
  const addTag = (tagName) => {
    const normalized = tagName.trim().toLowerCase();
    if (!normalized) return;
    if (selectedTags.some(t => t.toLowerCase() === normalized)) return;

    const newTags = [...selectedTags, normalized];
    onChange(newTags);
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Eliminar etiqueta
  const removeTag = (tagName) => {
    const newTags = selectedTags.filter(t => t.toLowerCase() !== tagName.toLowerCase());
    onChange(newTags);
  };

  // Manejar tecla Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0].name);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    }
    if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex flex-wrap gap-2 p-2 bg-[#1a1e29] border border-gray-700 rounded-lg focus-within:border-[#01c38e] transition">
        {/* Etiquetas seleccionadas */}
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-[#01c38e]/20 text-[#01c38e] px-2 py-1 rounded-lg text-sm"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-400 transition"
            >
              ×
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setShowSuggestions(true);
          }}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-white outline-none text-sm"
        />
      </div>

      {/* Sugerencias */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#132d46] border border-gray-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-400 text-sm">
              <div className="inline-block w-4 h-4 border-2 border-[#01c38e] border-t-transparent rounded-full animate-spin mr-2"></div>
              Buscando...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => addTag(tag.name)}
                  className="w-full text-left px-4 py-2 text-white hover:bg-[#1a1e29] transition text-sm flex items-center justify-between"
                >
                  <span>#{tag.name}</span>
                  <span className="text-xs text-gray-500">{tag.color || '#'}</span>
                </button>
              ))}
              <div className="px-4 py-2 border-t border-gray-700">
                <button
                  onClick={() => addTag(inputValue.trim())}
                  className="text-xs text-[#01c38e] hover:text-emerald-400 transition"
                >
                  + Crear "{inputValue.trim()}"
                </button>
              </div>
            </div>
          ) : inputValue.trim() ? (
            <div className="p-3 text-center">
              <p className="text-gray-400 text-sm">No se encontraron etiquetas</p>
              <button
                onClick={() => addTag(inputValue.trim())}
                className="mt-1 text-xs text-[#01c38e] hover:text-emerald-400 transition"
              >
                + Crear "{inputValue.trim()}"
              </button>
            </div>
          ) : (
            <div className="p-3 text-center text-gray-400 text-sm">
              Escribe para buscar etiquetas
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TagSelector;