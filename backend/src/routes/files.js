const express = require('express');
const multer = require('multer');
const fs = require('fs');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();

const upload = multer({ dest: './uploads/' });

// Middleware para logs
router.use((req, res, next) => {
  console.log(`📁 [FILES] ${req.method} ${req.url}`);
  next();
});

// ============================================
// FUNCIÓN PARA VERIFICAR PERMISOS
// ============================================
async function checkPermission(repoId, userId, requiredPermission) {
  if (!userId) return false;
  
  // Verificar si es el dueño
  const repoCheck = await db.query(
    `SELECT owner_id FROM repositories WHERE id = $1`,
    [repoId]
  );
  
  if (repoCheck.rows.length === 0) return false;
  if (repoCheck.rows[0].owner_id === parseInt(userId)) return true;
  
  // Verificar en colaboradores
  const collabCheck = await db.query(
    `SELECT permissions FROM collaborators 
     WHERE repository_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
    [repoId, userId]
  );
  
  if (collabCheck.rows.length === 0) return false;
  
  const permissions = collabCheck.rows[0].permissions;
  return permissions.includes(requiredPermission) || permissions.includes('all');
}

// ============================================
// SUBIR ARCHIVO - POST /api/repositories/:repoId/files
// ============================================
router.post('/repositories/:repoId/files', upload.single('file'), async (req, res) => {
  const { repoId } = req.params;
  const file = req.file;
  const userId = req.headers['user-id'];

  console.log('📤 Subiendo archivo:', file?.originalname, 'a repo:', repoId);

  if (!file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  // Verificar permisos (solo owner, maintainer o writer pueden subir)
  const hasPermission = await checkPermission(repoId, userId, 'upload');
  if (!hasPermission) {
    return res.status(403).json({ error: 'No tienes permiso para subir archivos a este repositorio' });
  }

  try {
    // Leer el contenido del archivo subido si es texto
    let fileContent = '';
    const isTextFile = file.mimetype === 'text/plain' || 
                        file.mimetype === 'application/javascript' ||
                        file.mimetype === 'text/markdown' ||
                        file.mimetype === 'application/json';
    
    if (isTextFile) {
      fileContent = fs.readFileSync(file.path, 'utf-8');
    } else {
      fileContent = `Archivo: ${file.originalname}\nTamaño: ${file.size} bytes\nTipo: ${file.mimetype}\n\nEste es un archivo binario.`;
    }

    const result = await db.query(
      `INSERT INTO files (repository_id, file_path, file_name, file_size, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [repoId, '/', file.originalname, file.size, fileContent]
    );

    // Limpiar archivo temporal
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'upload_file',
      actionType: 'create',
      repositoryId: repoId,
      fileId: result.rows[0].id,
      details: { fileName: file.originalname, fileSize: file.size }
    }, req);

    res.json({ success: true, file: result.rows[0], message: 'Archivo subido correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER ARCHIVOS DE UN REPOSITORIO - GET /api/repositories/:repoId/files
// ============================================
router.get('/repositories/:repoId/files', async (req, res) => {
  const { repoId } = req.params;
  const userId = req.headers['user-id'];

  try {
    // Verificar si el usuario tiene acceso al repositorio (owner o colaborador con al menos view)
    const repoCheck = await db.query(
      `SELECT owner_id, visibility FROM repositories WHERE id = $1`,
      [repoId]
    );
    
    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }
    
    const repo = repoCheck.rows[0];
    const isOwner = repo.owner_id === parseInt(userId);
    const isPublic = repo.visibility === 'public';
    
    if (!isOwner && !isPublic && userId) {
      const hasAccess = await checkPermission(repoId, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este repositorio' });
      }
    } else if (!isOwner && !isPublic && !userId) {
      return res.status(401).json({ error: 'Debes iniciar sesión para acceder a este repositorio' });
    }

    const result = await db.query(
      `SELECT * FROM files WHERE repository_id = $1 ORDER BY created_at DESC`,
      [repoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER CONTENIDO - GET /api/files/:fileId/content
// ============================================
router.get('/files/:fileId/content', async (req, res) => {
  const { fileId } = req.params;
  const userId = req.headers['user-id'];

  try {
    // Obtener el archivo y su repositorio
    const fileResult = await db.query(
      `SELECT f.*, r.owner_id, r.visibility 
       FROM files f
       JOIN repositories r ON f.repository_id = r.id
       WHERE f.id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const file = fileResult.rows[0];
    const isOwner = file.owner_id === parseInt(userId);
    const isPublic = file.visibility === 'public';
    
    // Verificar acceso
    if (!isOwner && !isPublic && userId) {
      const hasAccess = await checkPermission(file.repository_id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes permiso para ver este archivo' });
      }
    } else if (!isOwner && !isPublic && !userId) {
      return res.status(401).json({ error: 'Debes iniciar sesión para acceder a este archivo' });
    }
    
    // Obtener o generar contenido
    let content = file.content;
    
    if (!content) {
      const extension = file.file_name?.split('.').pop();
      if (extension === 'js' || extension === 'jsx') {
        content = `// Archivo: ${file.file_name}\n// Creado: ${new Date(file.created_at).toLocaleDateString()}\n\nconsole.log("Hola desde DevDB");\n`;
      } else if (extension === 'md') {
        content = `# ${file.file_name}\n\nEste es un archivo Markdown.\n`;
      } else if (extension === 'json') {
        content = `{\n  "name": "${file.file_name.replace('.json', '')}",\n  "version": "1.0.0"\n}\n`;
      } else {
        content = `Archivo: ${file.file_name}\nTamaño: ${(file.file_size / 1024).toFixed(2)} KB\n\nContenido del archivo.\n`;
      }
    }
    
    res.json({ content, file });
  } catch (error) {
    console.error('Error en GET /files/:fileId/content:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GUARDAR CONTENIDO - PUT /api/files/:fileId/content
// ============================================
router.put('/files/:fileId/content', async (req, res) => {
  const { fileId } = req.params;
  const { content } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Obtener información del archivo
    const fileResult = await db.query(
      `SELECT f.*, r.owner_id 
       FROM files f
       JOIN repositories r ON f.repository_id = r.id
       WHERE f.id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const file = fileResult.rows[0];
    const isOwner = file.owner_id === parseInt(userId);
    
    // Verificar permisos para editar (owner o colaborador con permiso edit)
    let canEdit = isOwner;
    if (!canEdit) {
      const hasEditPermission = await checkPermission(file.repository_id, userId, 'edit');
      canEdit = hasEditPermission;
    }
    
    if (!canEdit) {
      return res.status(403).json({ error: 'No tienes permiso para editar este archivo' });
    }
    
    // Actualizar contenido
    await db.query(
      `UPDATE files SET content = $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
      [content, fileId]
    );
    
    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'edit_file',
      actionType: 'update',
      repositoryId: file.repository_id,
      fileId: fileId,
      details: { fileName: file.file_name, version: file.version + 1 }
    }, req);
    
    res.json({ success: true, message: 'Archivo guardado correctamente' });
  } catch (error) {
    console.error('Error al guardar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DESCARGAR ARCHIVO - GET /api/files/:fileId/download
// ============================================
router.get('/files/:fileId/download', async (req, res) => {
  const { fileId } = req.params;
  const userId = req.headers['user-id'];

  try {
    const fileResult = await db.query(
      `SELECT f.*, r.owner_id, r.visibility 
       FROM files f
       JOIN repositories r ON f.repository_id = r.id
       WHERE f.id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const file = fileResult.rows[0];
    const isOwner = file.owner_id === parseInt(userId);
    const isPublic = file.visibility === 'public';
    
    // Verificar acceso para descargar
    if (!isOwner && !isPublic && userId) {
      const hasAccess = await checkPermission(file.repository_id, userId, 'download');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes permiso para descargar este archivo' });
      }
    } else if (!isOwner && !isPublic && !userId) {
      return res.status(401).json({ error: 'Debes iniciar sesión para descargar este archivo' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', file.file_size);
    
    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'download_file',
      actionType: 'download',
      repositoryId: file.repository_id,
      fileId: fileId,
      details: { fileName: file.file_name }
    }, req);
    
    res.send(file.content || `Archivo: ${file.file_name}\nTamaño: ${(file.file_size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ELIMINAR ARCHIVO - DELETE /api/files/:fileId
// ============================================
router.delete('/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Obtener información del archivo
    const fileResult = await db.query(
      `SELECT f.*, r.owner_id 
       FROM files f
       JOIN repositories r ON f.repository_id = r.id
       WHERE f.id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const file = fileResult.rows[0];
    const isOwner = file.owner_id === parseInt(userId);
    
    // Verificar permisos para eliminar (solo owner o maintainer)
    let canDelete = isOwner;
    if (!canDelete) {
      const hasDeletePermission = await checkPermission(file.repository_id, userId, 'manage');
      canDelete = hasDeletePermission;
    }
    
    if (!canDelete) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo' });
    }
    
    // Registrar actividad antes de eliminar
    await logActivity({
      userId: userId,
      action: 'delete_file',
      actionType: 'delete',
      repositoryId: file.repository_id,
      fileId: fileId,
      details: { fileName: file.file_name }
    }, req);
    
    await db.query(`DELETE FROM files WHERE id = $1`, [fileId]);
    
    res.json({ success: true, message: 'Archivo eliminado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;