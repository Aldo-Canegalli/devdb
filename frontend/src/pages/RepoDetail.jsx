import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import FileUploader from '../components/FileUploader';
import CodeEditor from '../components/CodeEditor';
import TextViewer from '../components/TextViewer';
import CollaboratorsList from '../components/CollaboratorsList';
import ForkButton from '../components/ForkButton';
import IssuesList from '../components/IssuesList';
import TagSelector from '../components/TagSelector';
import CreatePRModal from '../components/CreatePRModal';

function RepoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [files, setFiles] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('files');
  const [showUploader, setShowUploader] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [permissions, setPermissions] = useState(['view']);
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [message, setMessage] = useState('');
  
  const [editingFile, setEditingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [viewingText, setViewingText] = useState(null);
  
  const [isStarred, setIsStarred] = useState(false);
  const [starsCount, setStarsCount] = useState(0);
  const [isStarring, setIsStarring] = useState(false);

  // Estados para etiquetas
  const [tags, setTags] = useState([]);
  const [editingTags, setEditingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  
  // Estados para Pull Requests
  const [prCount, setPrCount] = useState(0);
  const [showCreatePR, setShowCreatePR] = useState(false);
  const [hasFork, setHasFork] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = repo?.owner_id === user?.id;

  const loadRepo = () => {
    const config = user?.id ? { headers: { 'user-id': user.id } } : {};
    api.get(`/repositories/${id}`, config)
      .then(response => {
        setRepo(response.data);
        setStarsCount(response.data.stars_count || 0);
        setTags(response.data.tags || []);
      })
      .catch(error => console.error('Error:', error));
  };

  const loadFiles = () => {
    const config = user?.id ? { headers: { 'user-id': user.id } } : {};
    api.get(`/repositories/${id}/files`, config)
      .then(response => setFiles(response.data))
      .catch(error => console.error('Error:', error));
  };

  const loadTokens = () => {
    if (!isOwner) return;
    api.get(`/repositories/${id}/tokens`, {
      headers: { 'user-id': user.id }
    })
      .then(response => setTokens(response.data))
      .catch(error => console.error('Error:', error));
  };

  const loadPRCount = async () => {
    try {
      const response = await api.get(`/pull-requests/repositories/${id}/count`);
      setPrCount(response.data.count);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkStarred = () => {
    if (!user.id) return;
    api.get(`/repositories/${id}/star`, {
      headers: { 'user-id': user.id }
    })
      .then(response => setIsStarred(response.data.starred))
      .catch(error => console.error('Error:', error));
  };

  const checkForkStatus = async () => {
    if (!user.id || isOwner) return;
    
    try {
      const response = await api.get(`/forks/repositories/${id}/check`, {
        headers: { 'user-id': user.id }
      });
      setHasFork(response.data.hasForked);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleStar = async () => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    
    if (isStarring) return;
    setIsStarring(true);

    try {
      if (isStarred) {
        await api.delete(`/repositories/${id}/star`, {
          headers: { 'user-id': user.id }
        });
        setStarsCount(starsCount - 1);
        setIsStarred(false);
        setMessage('⭐ Has quitado la estrella');
      } else {
        await api.post(`/repositories/${id}/star`, {}, {
          headers: { 'user-id': user.id }
        });
        setStarsCount(starsCount + 1);
        setIsStarred(true);
        setMessage('⭐ Has marcado como favorito');
      }
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al procesar la estrella');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsStarring(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    setMessage('');
    setNewToken(null);

    try {
      const response = await api.post(`/repositories/${id}/tokens`, {
        permissions,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null
      }, {
        headers: { 'user-id': user.id }
      });

      setNewToken(response.data.token);
      setMessage('✅ Token generado correctamente');
      loadTokens();
      setPermissions(['view']);
      setMaxUses('');
      setExpiresInDays('');
    } catch (error) {
      setMessage('❌ Error al generar token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId) => {
    if (!confirm('¿Revocar este token?')) return;
    
    try {
      await api.delete(`/tokens/${tokenId}`);
      loadTokens();
      setMessage('✅ Token revocado');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('❌ Error al revocar token');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    
    try {
      await api.delete(`/files/${fileId}`, {
        headers: { 'user-id': user.id }
      });
      loadFiles();
      setMessage('✅ Archivo eliminado');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('❌ Error al eliminar archivo');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('✅ Token copiado al portapapeles');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleEditFile = async (file) => {
    try {
      const config = user?.id ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(`/files/${file.id}/content`, config);
      setEditingFile(file);
      setFileContent(response.data.content);
      setIsEditing(false);
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al cargar el archivo');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleSaveCode = async () => {
    try {
      await api.put(`/files/${editingFile.id}/content`, { content: fileContent }, {
        headers: { 'user-id': user.id }
      });
      setIsEditing(false);
      setMessage('✅ Código guardado correctamente');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al guardar');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleViewText = async (file) => {
    try {
      const config = user?.id ? { headers: { 'user-id': user.id } } : {};
      const response = await api.get(`/files/${file.id}/content`, config);
      setViewingText({ file, content: response.data.content });
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al cargar el archivo');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      if (user?.id) {
        const response = await api.get(`/files/${file.id}/download`, {
          headers: { 'user-id': user.id },
          responseType: 'blob'
        });
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const downloadUrl = `http://localhost:3000/api/files/${file.id}/download`;
        window.open(downloadUrl, '_blank');
      }
      setMessage(`⬇️ Descargando ${file.file_name}...`);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al descargar el archivo');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  // Guardar etiquetas
  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      await api.put(`/tags/repositories/${id}`, { tags }, {
        headers: { 'user-id': user.id }
      });
      setEditingTags(false);
      setMessage('✅ Etiquetas actualizadas correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error al actualizar etiquetas');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSavingTags(false);
    }
  };

  useEffect(() => {
    loadRepo();
    loadFiles();
    checkStarred();
    loadPRCount();
    checkForkStatus();
  }, [id]);

  useEffect(() => {
    if (isOwner) {
      loadTokens();
    }
  }, [isOwner, repo]);

  if (loading && !repo) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block w-12 h-12 border-4 border-[#01c38e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Cargando repositorio...</p>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="bg-[#132d46] rounded-2xl p-12">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-2xl font-bold text-white mb-2">Repositorio no encontrado</h2>
          <p className="text-gray-400 mb-6">El repositorio que buscas no existe o no tienes acceso.</p>
          <Link to="/store" className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg inline-block">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-8">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {repo.repo_type === 'game' && <span className="text-3xl">🎮</span>}
              {repo.repo_type === 'code' && <span className="text-3xl">&lt;/&gt;</span>}
              {repo.repo_type === 'txt' && <span className="text-3xl">📚</span>}
              {repo.repo_type === 'mixed' && <span className="text-3xl">📦</span>}
              <h1 className="text-3xl font-bold text-white">{repo.name}</h1>
              <span className={`text-xs px-2 py-1 rounded ${
                repo.visibility === 'public' ? 'bg-green-600' : 
                repo.visibility === 'private' ? 'bg-red-600' : 'bg-yellow-600'
              } text-white`}>
                {repo.visibility === 'public' ? '🌍 Público' : 
                 repo.visibility === 'private' ? '🔒 Privado' : '🔗 Oculto'}
              </span>
            </div>
            <p className="text-gray-400 mb-3">{repo.description || 'Sin descripción'}</p>
            
            {/* Etiquetas */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span key={tag} className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">Sin etiquetas</span>
              )}
              {isOwner && !editingTags && (
                <button
                  onClick={() => setEditingTags(true)}
                  className="text-xs text-gray-400 hover:text-[#01c38e] transition ml-1"
                >
                  ✏️ Editar etiquetas
                </button>
              )}
            </div>

            {/* Editor de etiquetas */}
            {isOwner && editingTags && (
              <div className="mt-3 p-4 bg-[#1a1e29] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm text-gray-300">Editar etiquetas:</span>
                  <button
                    onClick={handleSaveTags}
                    disabled={savingTags}
                    className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-3 py-1 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {savingTags ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingTags(false);
                      setTags(repo.tags || []);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
                <TagSelector
                  selectedTags={tags}
                  onChange={setTags}
                  placeholder="Agregar etiquetas..."
                />
              </div>
            )}

            <div className="flex gap-4 text-sm text-gray-400 flex-wrap mt-3">
              <Link to={`/${repo.owner_name}`} className="hover:text-[#01c38e] transition">
                👤 @{repo.owner_name}
              </Link>
              <span>⭐ {starsCount} estrellas</span>
              <span>🍴 {repo.forks_count || 0} forks</span>
              <span>📅 Creado: {new Date(repo.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleStar}
              disabled={isStarring}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isStarred ? 'bg-yellow-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              } disabled:opacity-50`}
            >
              ⭐ {starsCount}
            </button>
            
            {user.id && repo.owner_id !== user.id && (
              <ForkButton 
                repoId={id} 
                repoName={repo.name}
                onForkSuccess={() => {
                  loadRepo();
                  loadFiles();
                  checkForkStatus();
                }}
              />
            )}
            
            {isOwner && (
              <button
                onClick={() => setActiveTab('tokens')}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg"
              >
                🔑 Generar Token
              </button>
            )}

            {/* Botón Nuevo Pull Request - solo si tiene fork */}
            {user.id && !isOwner && hasFork && (
              <button
                onClick={() => {
                  console.log('🔄 Abriendo modal de PR');
                  setShowCreatePR(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg transition"
              >
                + Nuevo Pull Request
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-[#132d46] border border-[#01c38e] text-[#01c38e] p-3 rounded-lg mb-4 text-center">
          {message}
        </div>
      )}

      <div className="border-b border-gray-700 mb-6">
        <div className="flex gap-6 flex-wrap">
          <button
            onClick={() => setActiveTab('files')}
            className={`pb-3 px-2 font-bold transition ${
              activeTab === 'files' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
            }`}
          >
            📁 Archivos ({files.length})
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab('tokens')}
              className={`pb-3 px-2 font-bold transition ${
                activeTab === 'tokens' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
              }`}
            >
              🔑 Tokens ({tokens.length})
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setActiveTab('collaborators')}
              className={`pb-3 px-2 font-bold transition ${
                activeTab === 'collaborators' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
              }`}
            >
              👥 Colaboradores
            </button>
          )}
          {(isOwner || repo?.visibility === 'public') && (
            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-3 px-2 font-bold transition ${
                activeTab === 'issues' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
              }`}
            >
              🐛 Incidencias
            </button>
          )}
          {(isOwner || repo?.visibility === 'public') && (
            <button
              onClick={() => setActiveTab('pull-requests')}
              className={`pb-3 px-2 font-bold transition ${
                activeTab === 'pull-requests' ? 'border-b-2 border-[#01c38e] text-[#01c38e]' : 'text-gray-400 hover:text-white'
              }`}
            >
              🔀 Pull Requests ({prCount})
            </button>
          )}
        </div>
      </div>

      {activeTab === 'files' && (
        <div>
          {isOwner && (
            <div className="mb-6">
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <span className="text-xl">+</span> Subir archivo
              </button>
              
              {showUploader && (
                <div className="mt-4">
                  <FileUploader repoId={id} onUploadSuccess={() => {
                    loadFiles();
                    setShowUploader(false);
                  }} />
                </div>
              )}
            </div>
          )}

          {files.length === 0 ? (
            <div className="bg-[#132d46] rounded-xl p-12 text-center border border-gray-700">
              <span className="text-5xl mb-4 block">📂</span>
              <h3 className="text-xl font-bold text-white mb-2">No hay archivos</h3>
              <p className="text-gray-400">Este repositorio aún no tiene archivos.</p>
              {isOwner && (
                <button
                  onClick={() => setShowUploader(true)}
                  className="mt-4 bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"
                >
                  <span>+</span> Subir mi primer archivo
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
                <h2 className="font-bold text-white">Archivos del repositorio</h2>
              </div>
              <div className="divide-y divide-gray-700">
                {files.map((file) => {
                  const extension = file.file_name?.split('.').pop();
                  const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json'].includes(extension);
                  const isText = ['md', 'txt'].includes(extension);
                  const isGame = ['exe', 'zip', 'rar', '7z', 'msi', 'apk', 'dmg', 'pkg', 'appimage'].includes(extension);
                  
                  return (
                    <div key={file.id} className="p-4 flex items-center justify-between hover:bg-[#1a1e29] transition flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {isGame ? '🎮' : isCode ? '💻' : isText ? '📄' : '📎'}
                        </span>
                        <div>
                          <p className="text-white font-medium">{file.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB • v{file.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isCode && (
                          <button
                            onClick={() => handleEditFile(file)}
                            className="text-[#01c38e] hover:text-emerald-400 text-sm"
                          >
                            Editar
                          </button>
                        )}
                        {isText && (
                          <button
                            onClick={() => handleViewText(file)}
                            className="text-[#01c38e] hover:text-emerald-400 text-sm"
                          >
                            Leer
                          </button>
                        )}
                        {(isGame || (!isCode && !isText)) && (
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className="text-[#01c38e] hover:text-emerald-400 text-sm flex items-center gap-1"
                          >
                            ⬇️ Descargar
                          </button>
                        )}
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tokens' && isOwner && (
        <div>
          <div className="bg-[#132d46] rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">🔑 Generar nuevo token</h3>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Permisos</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes('view')}
                      onChange={(e) => {
                        if (e.target.checked) setPermissions([...permissions, 'view']);
                        else setPermissions(permissions.filter(p => p !== 'view'));
                      }}
                      className="rounded border-gray-600"
                    />
                    <span className="text-white">👁️ Ver</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes('download')}
                      onChange={(e) => {
                        if (e.target.checked) setPermissions([...permissions, 'download']);
                        else setPermissions(permissions.filter(p => p !== 'download'));
                      }}
                      className="rounded border-gray-600"
                    />
                    <span className="text-white">⬇️ Descargar</span>
                  </label>
                  {repo.repo_type === 'game' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.includes('play')}
                        onChange={(e) => {
                          if (e.target.checked) setPermissions([...permissions, 'play']);
                          else setPermissions(permissions.filter(p => p !== 'play'));
                        }}
                        className="rounded border-gray-600"
                      />
                      <span className="text-white">🎮 Jugar</span>
                    </label>
                  )}
                  {repo.repo_type === 'code' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.includes('edit')}
                        onChange={(e) => {
                          if (e.target.checked) setPermissions([...permissions, 'edit']);
                          else setPermissions(permissions.filter(p => p !== 'edit'));
                        }}
                        className="rounded border-gray-600"
                      />
                      <span className="text-white">✏️ Editar</span>
                    </label>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Usos máximos</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                  className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Expira en (días)</label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Nunca"
                  className="w-full bg-[#1a1e29] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#01c38e]"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateToken}
              disabled={generatingToken}
              className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {generatingToken ? 'Generando...' : '🔑 Generar Token'}
            </button>
            
            {newToken && (
              <div className="mt-4 p-3 bg-[#1a1e29] rounded-lg border border-[#01c38e]">
                <p className="text-sm text-gray-300 mb-2">Token generado (guárdalo):</p>
                <code className="text-[#01c38e] break-all text-sm">{newToken}</code>
                <button
                  onClick={() => copyToClipboard(newToken)}
                  className="ml-3 text-sm bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                >
                  Copiar
                </button>
              </div>
            )}
          </div>

          {tokens.length > 0 && (
            <div className="bg-[#132d46] rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-[#1a1e29]">
                <h3 className="font-bold text-white">Tokens activos ({tokens.length})</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {tokens.map((token) => (
                  <div key={token.id} className="p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {token.permissions?.map((p) => (
                            <span key={p} className="text-xs bg-[#01c38e]/20 text-[#01c38e] px-2 py-1 rounded">
                              {p === 'view' ? '👁️ Ver' : 
                               p === 'download' ? '⬇️ Descargar' : 
                               p === 'play' ? '🎮 Jugar' : 
                               p === 'edit' ? '✏️ Editar' : p}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-400">
                          <span>Usos: {token.uses_count || 0}</span>
                          {token.max_uses && <span> / {token.max_uses}</span>}
                          {token.expires_at && (
                            <span className="ml-3">
                              Expira: {new Date(token.expires_at).toLocaleDateString()}
                            </span>
                          )}
                          <span className="ml-3">
                            Creado: {new Date(token.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeToken(token.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Revocar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {tokens.length === 0 && (
            <div className="bg-[#132d46] rounded-xl p-8 text-center border border-gray-700">
              <span className="text-4xl mb-2 block">🔐</span>
              <p className="text-gray-400">No hay tokens generados aún.</p>
              <p className="text-sm text-gray-500 mt-1">Genera tu primer token para compartir acceso.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'collaborators' && isOwner && (
        <CollaboratorsList repoId={id} isOwner={isOwner} />
      )}

      {activeTab === 'issues' && (
        <IssuesList repoId={id} isOwner={isOwner} />
      )}

      {activeTab === 'pull-requests' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-sm">
              {prCount} Pull Request{prCount !== 1 ? 's' : ''} abiertos
            </p>
            {/* Botón Nuevo PR dentro de la pestaña - solo si tiene fork */}
            {user.id && !isOwner && hasFork && (
              <button
                onClick={() => setShowCreatePR(true)}
                className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg transition"
              >
                + Nuevo Pull Request
              </button>
            )}
          </div>

          <Link 
            to={`/pull-requests/${id}`}
            className="block bg-[#132d46] rounded-xl p-4 border border-gray-700 hover:border-[#01c38e] transition text-center"
          >
            <span className="text-[#01c38e]">Ver todos los Pull Requests →</span>
          </Link>

          <CreatePRModal
            isOpen={showCreatePR}
            onClose={() => setShowCreatePR(false)}
            repoId={id}
            repoName={repo?.name}
            onSuccess={() => {
              loadPRCount();
              setShowCreatePR(false);
            }}
          />
        </div>
      )}

      {editingFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#132d46] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-white font-bold">{editingFile.file_name}</h3>
                <p className="text-xs text-gray-400">{editingFile.file_path}</p>
              </div>
              <div className="flex gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29] font-bold px-4 py-2 rounded-lg"
                  >
                    ✏️ Editar
                  </button>
                ) : (
                  <button
                    onClick={handleSaveCode}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg"
                  >
                    💾 Guardar
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingFile(null);
                    setFileContent('');
                    setIsEditing(false);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-4">
              <CodeEditor
                code={fileContent}
                language={editingFile.file_name?.split('.').pop()}
                onChange={(value) => setFileContent(value)}
                readOnly={!isEditing}
              />
            </div>
          </div>
        </div>
      )}

      {viewingText && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#132d46] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">{viewingText.file.file_name}</h3>
                <p className="text-xs text-gray-400">
                  {(viewingText.file.file_size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setViewingText(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <TextViewer
                content={viewingText.content}
                title={viewingText.file.file_name}
              />
            </div>
          </div>
        </div>
      )}

      {/* 👇 MODAL DE PULL REQUEST - AL FINAL 👇 */}
      <CreatePRModal
        isOpen={showCreatePR}
        onClose={() => {
          console.log('🔴 Cerrando modal de PR');
          setShowCreatePR(false);
        }}
        repoId={id}
        repoName={repo?.name}
        onSuccess={() => {
          console.log('✅ PR creado exitosamente');
          loadPRCount();
          setShowCreatePR(false);
        }}
      />
    </div>
  );
}

export default RepoDetail;