const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();
const notificationService = require('../services/notificationService');

// ============================================
// FUNCIÓN PARA COPIAR UN REPOSITORIO (FORK)
// ============================================
async function copyRepository(originalRepoId, userId) {
  // Obtener el repositorio original
  const originalRepo = await db.query(
    `SELECT name, description, repo_type, visibility FROM repositories WHERE id = $1`,
    [originalRepoId]
  );
  
  if (originalRepo.rows.length === 0) {
    throw new Error('Repositorio original no encontrado');
  }
  
  const repo = originalRepo.rows[0];
  
  // Crear nuevo repositorio (copia)
  const newRepoName = `${repo.name}-fork`;
  const newRepo = await db.query(
    `INSERT INTO repositories (name, description, repo_type, visibility, owner_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [newRepoName, repo.description, repo.repo_type, 'private', userId]
  );
  
  const newRepoId = newRepo.rows[0].id;
  
  // Copiar archivos del repositorio original
  const files = await db.query(
    `SELECT file_path, file_name, file_size, content FROM files WHERE repository_id = $1`,
    [originalRepoId]
  );
  
  for (const file of files.rows) {
    await db.query(
      `INSERT INTO files (repository_id, file_path, file_name, file_size, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [newRepoId, file.file_path, file.file_name, file.file_size, file.content]
    );
  }
  
  // Registrar el fork en la tabla forks
  await db.query(
    `INSERT INTO forks (original_repo_id, forked_repo_id, forked_by)
     VALUES ($1, $2, $3)`,
    [originalRepoId, newRepoId, userId]
  );
  
  // Incrementar contador de forks del repositorio original
  await db.query(
    `UPDATE repositories SET forks_count = forks_count + 1 WHERE id = $1`,
    [originalRepoId]
  );
  
  return newRepo.rows[0];
}

// ============================================
// FUNCIÓN PARA SINCRONIZAR CAMBIOS DEL ORIGINAL
// ============================================
async function syncRepository(forkedRepoId, userId) {
  // Verificar que el repositorio es un fork
  const forkInfo = await db.query(
    `SELECT f.*, r.owner_id 
     FROM forks f
     JOIN repositories r ON f.forked_repo_id = r.id
     WHERE f.forked_repo_id = $1`,
    [forkedRepoId]
  );
  
  if (forkInfo.rows.length === 0) {
    throw new Error('Este repositorio no es un fork');
  }
  
  const fork = forkInfo.rows[0];
  const originalRepoId = fork.original_repo_id;
  
  // Verificar que el usuario es dueño del fork
  if (fork.owner_id !== parseInt(userId)) {
    throw new Error('No tienes permiso para sincronizar este fork');
  }
  
  // Eliminar archivos actuales del fork
  await db.query(`DELETE FROM files WHERE repository_id = $1`, [forkedRepoId]);
  
  // Copiar archivos actualizados del original
  const files = await db.query(
    `SELECT file_path, file_name, file_size, content FROM files WHERE repository_id = $1`,
    [originalRepoId]
  );
  
  for (const file of files.rows) {
    await db.query(
      `INSERT INTO files (repository_id, file_path, file_name, file_size, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [forkedRepoId, file.file_path, file.file_name, file.file_size, file.content]
    );
  }
  
  // Actualizar metadata del fork
  const originalRepo = await db.query(
    `SELECT name, description FROM repositories WHERE id = $1`,
    [originalRepoId]
  );
  
  const original = originalRepo.rows[0];
  
  await db.query(
    `UPDATE repositories 
     SET description = $1, updated_at = NOW()
     WHERE id = $2`,
    [original.description, forkedRepoId]
  );
  
  // Actualizar última sincronización
  await db.query(
    `UPDATE forks SET last_synced_at = NOW(), synced_commits = synced_commits + 1
     WHERE forked_repo_id = $1`,
    [forkedRepoId]
  );
  
  return { success: true, message: 'Fork sincronizado correctamente' };
}

// ============================================
// OBTENER FORKS DE UN REPOSITORIO (NUEVA RUTA)
// GET /api/forks/repositories/:repoId
// ============================================
router.get('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;

  console.log('📋 Obteniendo forks del repo:', repoId);

  try {
    const result = await db.query(
      `SELECT f.*, u.username as forked_by_username, r.name as forked_repo_name
       FROM forks f
       JOIN users u ON f.forked_by = u.id
       JOIN repositories r ON f.forked_repo_id = r.id
       WHERE f.original_repo_id = $1
       ORDER BY f.created_at DESC`,
      [repoId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREAR FORK - POST /api/forks/repositories/:repoId
// ============================================
router.post('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;
  const userId = req.headers['user-id'];

  console.log('🍴 Creando fork del repo:', repoId, 'por usuario:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Verificar que el repositorio existe
    const repoCheck = await db.query(
      `SELECT id, owner_id, visibility, name, description, repo_type FROM repositories WHERE id = $1`,
      [repoId]
    );
    
    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }
    
    const repo = repoCheck.rows[0];
    
    // No se puede forkear tu propio repositorio
    if (repo.owner_id === parseInt(userId)) {
      return res.status(400).json({ error: 'No puedes forkear tu propio repositorio' });
    }
    
    // Solo repositorios públicos
    if (repo.visibility !== 'public') {
      return res.status(403).json({ error: 'Solo puedes forkear repositorios públicos' });
    }
    
    // Verificar si ya hizo fork
    const existingFork = await db.query(
      `SELECT * FROM forks WHERE original_repo_id = $1 AND forked_by = $2`,
      [repoId, userId]
    );
    
    if (existingFork.rows.length > 0) {
      const forkRepo = await db.query(
        `SELECT * FROM repositories WHERE id = $1`,
        [existingFork.rows[0].forked_repo_id]
      );
      return res.json({ 
        success: true, 
        forked: false, 
        message: 'Ya tienes un fork de este repositorio',
        repository: forkRepo.rows[0]
      });
    }
    
    // Crear el fork
    const newRepo = await copyRepository(repoId, userId);
    
    res.json({ 
      success: true, 
      forked: true,
      message: 'Fork creado correctamente',
      repository: newRepo
    });

    // Logs y notificaciones en background (no bloquean la respuesta)
    try {
      await logActivity({
        userId: userId,
        action: 'fork_repository',
        actionType: 'create',
        repositoryId: newRepo.id,
        details: { originalRepoId: repoId }
      }, req);
    } catch (logError) {
      console.log('⚠️ Error en logActivity (no crítico):', logError.message);
    }

    try {
      await notificationService.notifyFork(repoId, userId, userId);
    } catch (notifError) {
      console.log('⚠️ Error en notificación (no crítico):', notifError.message);
    }
    
  } catch (error) {
    console.error('Error al crear fork:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SINCRONIZAR FORK - POST /api/forks/repositories/:forkId/sync
// ============================================
router.post('/repositories/:forkId/sync', async (req, res) => {
  const { forkId } = req.params;
  const userId = req.headers['user-id'];

  console.log('🔄 Sincronizando fork:', forkId, 'por usuario:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await syncRepository(forkId, userId);
    
    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'sync_fork',
      actionType: 'update',
      repositoryId: forkId,
      details: { synced: true }
    }, req);
    
    res.json(result);
  } catch (error) {
    console.error('Error al sincronizar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VERIFICAR SI UN USUARIO YA HIZO FORK
// GET /api/forks/repositories/:repoId/check
// ============================================
router.get('/repositories/:repoId/check', async (req, res) => {
  const { repoId } = req.params;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.json({ hasForked: false });
  }

  try {
    const result = await db.query(
      `SELECT f.*, r.id as fork_repo_id 
       FROM forks f
       JOIN repositories r ON f.forked_repo_id = r.id
       WHERE f.original_repo_id = $1 AND f.forked_by = $2`,
      [repoId, userId]
    );
    
    if (result.rows.length > 0) {
      res.json({ 
        hasForked: true, 
        forkRepoId: result.rows[0].fork_repo_id,
        lastSyncedAt: result.rows[0].last_synced_at
      });
    } else {
      res.json({ hasForked: false });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER INFORMACIÓN DEL FORK
// GET /api/forks/info/:forkId
// ============================================
router.get('/info/:forkId', async (req, res) => {
  const { forkId } = req.params;

  try {
    const result = await db.query(
      `SELECT f.*, 
              r.name as fork_name, r.owner_id as fork_owner_id,
              orig.name as original_name, orig.owner_id as original_owner_id,
              u1.username as fork_owner,
              u2.username as original_owner
       FROM forks f
       JOIN repositories r ON f.forked_repo_id = r.id
       JOIN repositories orig ON f.original_repo_id = orig.id
       JOIN users u1 ON r.owner_id = u1.id
       JOIN users u2 ON orig.owner_id = u2.id
       WHERE f.forked_repo_id = $1`,
      [forkId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No es un fork' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;