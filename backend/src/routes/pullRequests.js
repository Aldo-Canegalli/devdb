const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const notificationService = require('../services/notificationService');
const router = express.Router();

// ============================================
// FUNCIÓN PARA COPIAR ARCHIVOS ENTRE REPOSITORIOS
// ============================================
async function copyFilesBetweenRepos(fromRepoId, toRepoId) {
  // Obtener todos los archivos del repositorio origen
  const files = await db.query(`
    SELECT file_path, file_name, file_size, content 
    FROM files 
    WHERE repository_id = $1
  `, [fromRepoId]);

  // Copiar cada archivo al repositorio destino
  for (const file of files.rows) {
    // Verificar si el archivo ya existe en el destino
    const existing = await db.query(`
      SELECT id FROM files 
      WHERE repository_id = $1 AND file_path = $2 AND file_name = $3
    `, [toRepoId, file.file_path, file.file_name]);

    if (existing.rows.length > 0) {
      // Actualizar archivo existente
      await db.query(`
        UPDATE files 
        SET content = $1, file_size = $2, version = version + 1, updated_at = NOW()
        WHERE id = $3
      `, [file.content, file.file_size, existing.rows[0].id]);
    } else {
      // Insertar nuevo archivo
      await db.query(`
        INSERT INTO files (repository_id, file_path, file_name, file_size, content)
        VALUES ($1, $2, $3, $4, $5)
      `, [toRepoId, file.file_path, file.file_name, file.file_size, file.content]);
    }
  }
}

// ============================================
// FUNCIÓN PARA VERIFICAR PERMISOS EN UN REPO
// ============================================
async function checkPermission(repoId, userId, requiredPermission) {
  if (!userId) return false;
  
  const repoCheck = await db.query(
    `SELECT owner_id FROM repositories WHERE id = $1`,
    [repoId]
  );
  
  if (repoCheck.rows.length === 0) return false;
  if (repoCheck.rows[0].owner_id === parseInt(userId)) return true;
  
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
// OBTENER PULL REQUESTS DE UN REPOSITORIO
// GET /api/pull-requests/repositories/:repoId
// ============================================
router.get('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;
  const { status } = req.query;
  const userId = req.headers['user-id'];

  try {
    let query = `
      SELECT pr.*,
             u1.username as created_by_username,
             u2.username as merged_by_username,
             u3.username as closed_by_username,
             from_repo.name as from_repo_name,
             to_repo.name as to_repo_name,
             COUNT(DISTINCT prr.id) as reviews_count,
             COUNT(DISTINCT CASE WHEN prr.status = 'approved' THEN prr.id END) as approvals_count
      FROM pull_requests pr
      JOIN users u1 ON pr.created_by = u1.id
      LEFT JOIN users u2 ON pr.merged_by = u2.id
      LEFT JOIN users u3 ON pr.closed_by = u3.id
      JOIN repositories from_repo ON pr.from_repo_id = from_repo.id
      JOIN repositories to_repo ON pr.to_repo_id = to_repo.id
      LEFT JOIN pull_request_reviews prr ON prr.pull_request_id = pr.id
      WHERE pr.to_repo_id = $1
    `;
    
    const params = [repoId];
    let paramIndex = 2;

    if (status && ['open', 'merged', 'closed', 'draft'].includes(status)) {
      query += ` AND pr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` GROUP BY pr.id, u1.username, u2.username, u3.username, from_repo.name, to_repo.name
               ORDER BY pr.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER DETALLE DE UN PULL REQUEST
// GET /api/pull-requests/:prId
// ============================================
router.get('/:prId', async (req, res) => {
  const { prId } = req.params;

  try {
    const result = await db.query(`
      SELECT pr.*,
             u1.username as created_by_username,
             u2.username as merged_by_username,
             u3.username as closed_by_username,
             from_repo.name as from_repo_name,
             to_repo.name as to_repo_name,
             from_repo.owner_id as from_repo_owner_id,
             to_repo.owner_id as to_repo_owner_id
      FROM pull_requests pr
      JOIN users u1 ON pr.created_by = u1.id
      LEFT JOIN users u2 ON pr.merged_by = u2.id
      LEFT JOIN users u3 ON pr.closed_by = u3.id
      JOIN repositories from_repo ON pr.from_repo_id = from_repo.id
      JOIN repositories to_repo ON pr.to_repo_id = to_repo.id
      WHERE pr.id = $1
    `, [prId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pull Request no encontrado' });
    }

    // Obtener revisiones
    const reviews = await db.query(`
      SELECT prr.*, u.username as reviewer_name
      FROM pull_request_reviews prr
      JOIN users u ON prr.reviewer_id = u.id
      WHERE prr.pull_request_id = $1
      ORDER BY prr.created_at DESC
    `, [prId]);

    res.json({
      ...result.rows[0],
      reviews: reviews.rows
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREAR UN PULL REQUEST
// POST /api/pull-requests
// ============================================
router.post('/', async (req, res) => {
  const { title, description, fromRepoId, toRepoId, fromBranch = 'main', toBranch = 'main' } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  if (!fromRepoId || !toRepoId) {
    return res.status(400).json({ error: 'Los repositorios origen y destino son requeridos' });
  }

  try {
    // Verificar que el repositorio origen existe y pertenece al usuario
    const fromRepoCheck = await db.query(
      `SELECT id, owner_id FROM repositories WHERE id = $1`,
      [fromRepoId]
    );
    if (fromRepoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio origen no encontrado' });
    }
    if (fromRepoCheck.rows[0].owner_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'No eres dueño del repositorio origen' });
    }

    // Verificar que el repositorio destino existe
    const toRepoCheck = await db.query(
      `SELECT id, owner_id FROM repositories WHERE id = $1`,
      [toRepoId]
    );
    if (toRepoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio destino no encontrado' });
    }

    // Verificar que no sea el mismo repositorio
    if (fromRepoId === toRepoId) {
      return res.status(400).json({ error: 'No puedes crear un PR al mismo repositorio' });
    }

    // Crear el PR
    const result = await db.query(`
      INSERT INTO pull_requests (title, description, from_repo_id, to_repo_id, from_branch, to_branch, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title.trim(), description, fromRepoId, toRepoId, fromBranch, toBranch, userId]);

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'create_pull_request',
      actionType: 'create',
      repositoryId: toRepoId,
      details: { prId: result.rows[0].id, title: title.trim() }
    }, req);

    // Notificar al dueño del repositorio destino
    const toRepoOwner = toRepoCheck.rows[0].owner_id;
    if (toRepoOwner !== parseInt(userId)) {
      await notificationService.notifyPullRequest(toRepoId, userId, userId, title.trim(), result.rows[0].id);
    }

    res.status(201).json({
      success: true,
      message: 'Pull Request creado correctamente',
      pullRequest: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTUALIZAR ESTADO DE UN PULL REQUEST (MERGE/CLOSE)
// PUT /api/pull-requests/:prId
// ============================================
router.put('/:prId', async (req, res) => {
  const { prId } = req.params;
  const { status } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!status || !['merged', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser "merged" o "closed"' });
  }

  try {
    const prResult = await db.query(`
      SELECT pr.*, r.owner_id as repo_owner_id
      FROM pull_requests pr
      JOIN repositories r ON pr.to_repo_id = r.id
      WHERE pr.id = $1
    `, [prId]);

    if (prResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pull Request no encontrado' });
    }

    const pr = prResult.rows[0];

    if (pr.repo_owner_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este Pull Request' });
    }

    if (pr.status !== 'open') {
      return res.status(400).json({ error: `Este Pull Request ya está ${pr.status}` });
    }

    // Si es MERGE, copiar los archivos
    if (status === 'merged') {
      try {
        await copyFilesBetweenRepos(pr.from_repo_id, pr.to_repo_id);
        console.log(`✅ Archivos copiados del repo ${pr.from_repo_id} al ${pr.to_repo_id}`);
      } catch (copyError) {
        console.error('Error al copiar archivos:', copyError);
        return res.status(500).json({ 
          error: 'Error al fusionar los archivos', 
          details: copyError.message 
        });
      }
    }

    // Actualizar estado
    let query = `UPDATE pull_requests SET status = $1`;
    const params = [status];
    
    if (status === 'merged') {
      query += `, merged_by = $2, merged_at = NOW()`;
      params.push(userId);
    } else if (status === 'closed') {
      query += `, closed_by = $2, closed_at = NOW()`;
      params.push(userId);
    }
    
    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(prId);

    const result = await db.query(query, params);

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: status === 'merged' ? 'merge_pull_request' : 'close_pull_request',
      actionType: 'update',
      repositoryId: pr.to_repo_id,
      details: { prId, status }
    }, req);

    res.json({
      success: true,
      message: `Pull Request ${status === 'merged' ? 'fusionado' : 'cerrado'} correctamente`,
      pullRequest: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AGREGAR REVISIÓN A UN PULL REQUEST
// POST /api/pull-requests/:prId/reviews
// ============================================
router.post('/:prId/reviews', async (req, res) => {
  const { prId } = req.params;
  const { status, comment } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!status || !['approved', 'changes_requested', 'commented'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const prResult = await db.query(`
      SELECT pr.*, r.owner_id as repo_owner_id
      FROM pull_requests pr
      JOIN repositories r ON pr.to_repo_id = r.id
      WHERE pr.id = $1
    `, [prId]);

    if (prResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pull Request no encontrado' });
    }

    const pr = prResult.rows[0];

    if (pr.status !== 'open') {
      return res.status(400).json({ error: 'Este Pull Request ya está cerrado' });
    }

    // Verificar si ya existe una revisión
    const existingReview = await db.query(
      `SELECT id FROM pull_request_reviews WHERE pull_request_id = $1 AND reviewer_id = $2`,
      [prId, userId]
    );

    let result;
    if (existingReview.rows.length > 0) {
      result = await db.query(`
        UPDATE pull_request_reviews
        SET status = $1, comment = $2, updated_at = NOW()
        WHERE pull_request_id = $3 AND reviewer_id = $4
        RETURNING *
      `, [status, comment, prId, userId]);
    } else {
      result = await db.query(`
        INSERT INTO pull_request_reviews (pull_request_id, reviewer_id, status, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [prId, userId, status, comment]);
    }

    await logActivity({
      userId: userId,
      action: 'review_pull_request',
      actionType: 'create',
      repositoryId: pr.to_repo_id,
      details: { prId, status }
    }, req);

    res.json({
      success: true,
      message: `Revisión ${status === 'approved' ? 'aprobada' : status === 'changes_requested' ? 'con cambios solicitados' : 'agregada'}`,
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER REVISIONES DE UN PULL REQUEST
// GET /api/pull-requests/:prId/reviews
// ============================================
router.get('/:prId/reviews', async (req, res) => {
  const { prId } = req.params;

  try {
    const result = await db.query(`
      SELECT prr.*, u.username as reviewer_name
      FROM pull_request_reviews prr
      JOIN users u ON prr.reviewer_id = u.id
      WHERE prr.pull_request_id = $1
      ORDER BY prr.created_at DESC
    `, [prId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONTAR PULL REQUESTS ABIERTOS DE UN REPOSITORIO
// GET /api/pull-requests/repositories/:repoId/count
// ============================================
router.get('/repositories/:repoId/count', async (req, res) => {
  const { repoId } = req.params;

  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM pull_requests WHERE to_repo_id = $1 AND status = 'open'`,
      [repoId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;