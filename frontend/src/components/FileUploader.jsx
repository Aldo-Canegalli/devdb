import { useState } from 'react';
import api from '../api/axios';

function FileUploader({ repoId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Selecciona un archivo primero');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/repositories/${repoId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'user-id': user.id }
      });

      setMessage('✅ Archivo subido correctamente');
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
      
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-600 rounded-lg p-6 text-center">
      <div className="mb-4">
        <span className="text-4xl">📁</span>
      </div>
      <input
        id="file-input"
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="file-input"
        className="bg-[#1a1e29] hover:bg-[#132d46] text-gray-300 font-bold py-2 px-4 rounded-lg cursor-pointer transition inline-block mr-3"
      >
        Seleccionar archivo
      </label>
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
      >
        {uploading ? 'Subiendo...' : 'Subir'}
      </button>
      {message && <p className="mt-3 text-sm">{message}</p>}
      {file && <p className="mt-2 text-sm text-gray-400">Archivo: {file.name}</p>}
    </div>
  );
}

export default FileUploader;