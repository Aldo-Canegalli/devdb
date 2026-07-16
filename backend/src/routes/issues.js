const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();
const notificationService = require('../services/notificationService');

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
// OBTENER ISSUES DE UN REPOSITORIO
// GET /api/issues/repositories/:repoId
// ============================================
router.get('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;
  const userId = req.headers['user-id'];
  const { status, priority, limit = 50 } = req.query;

  console.log('📋 GET issues - repo:', repoId);

  try {
    const repoCheck = await db.query(
  `SELECT owner_id, visibility FROM repositories WHERE id = $1`,
  [repoId]
);

if (repoCheck.rows.length === 0) {
  return res.status(404).json({ error: 'Repositorio no encontrado' });
}

const repo = repoCheck.rows[0];
const isPublic = repo.visibility === 'public';

// Si es público, cualquier usuario logueado puede crear issues
// Si es privado, solo dueño o colaboradores con permisos
if (!isPublic) {
  const isOwner = repo.owner_id === parseInt(userId);
  if (!isOwner) {
    const hasAccess = await checkPermission(repoId, userId, 'view');
    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes acceso a este repositorio' });
    }
  }
}
// Si es público, permitir (sigue adelante)

    // Construir consulta con filtros
    let query = `
      SELECT i.*, 
             u1.username as creador,
             u2.username as asignado,
             u3.username as cerrado_por,
             COUNT(c.id) as comentarios_count
      FROM issues i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN users u3 ON i.closed_by = u3.id
      LEFT JOIN comments c ON c.issue_id = i.id
      WHERE i.repository_id = $1
    `;
    
    const params = [repoId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (priority) {
      query += ` AND i.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }
    
    query += ` GROUP BY i.id, u1.username, u2.username, u3.username
               ORDER BY 
                 CASE i.status 
                   WHEN 'open' THEN 1
                   WHEN 'in_progress' THEN 2
                   WHEN 'closed' THEN 3
                 END,
                 i.priority DESC,
                 i.created_at DESC
               LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OBTENER DETALLE DE UN ISSUE
// GET /api/issues/:issueId
router.get('/:issueId', async (req, res) => {
  const { issueId } = req.params;
  const userId = req.headers['user-id'];

  console.log('📋 GET issue detail - ID:', issueId);

  try {
    const result = await db.query(
      `SELECT i.*, 
              u1.username as creador,
              u2.username as asignado,
              u3.username as cerrado_por,
              r.name as repo_name,
              r.owner_id as repo_owner_id,
              r.visibility
       FROM issues i
       JOIN repositories r ON i.repository_id = r.id
       LEFT JOIN users u1 ON i.created_by = u1.id
       LEFT JOIN users u2 ON i.assigned_to = u2.id
       LEFT JOIN users u3 ON i.closed_by = u3.id
       WHERE i.id = $1`,
      [issueId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    
    const issue = result.rows[0];
    
    // Si el repositorio es público, cualquiera puede ver la incidencia
    if (issue.visibility === 'public') {
      return res.json(issue);
    }
    
    // Si es privado, verificar autenticación y permisos
    if (!userId) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    
    const isOwner = issue.repo_owner_id === parseInt(userId);
    
    if (!isOwner) {
      const hasAccess = await checkPermission(issue.repository_id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta incidencia' });
      }
    }
    
    res.json(issue);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREAR ISSUE - POST /api/issues/repositories/:repoId
router.post('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;
  const { title, description, priority = 'normal' } = req.body;
  const userId = req.headers['user-id'];

  console.log('📝 Creando issue - repo:', repoId, 'user:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  try {
    // Insertar en la base de datos
    const result = await db.query(
      `INSERT INTO issues (repository_id, title, description, priority, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [repoId, title.trim(), description || '', priority, userId]
    );

    console.log('✅ Issue creado:', result.rows[0].id);

    // Registrar actividad (con try-catch para que no falle)
    try {
      await logActivity({
        userId: userId,
        action: 'create_issue',
        actionType: 'create',
        repositoryId: repoId,
        details: { issueId: result.rows[0].id, title: title.trim() }
      }, req);
    } catch (logError) {
      console.log('⚠️ Error en logActivity (no crítico):', logError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Incidencia creada correctamente',
      issue: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear issue:', error);
    res.status(500).json({
      error: error.message,
      details: 'Error al crear la incidencia'
    });
  }
});

// ============================================
// ACTUALIZAR ISSUE - PUT /api/issues/:issueId
// ============================================
router.put('/:issueId', async (req, res) => {
  const { issueId } = req.params;
  const { title, description, status, priority, assigned_to } = req.body;
  const userId = req.headers['user-id'];

  console.log('✏️ PUT issue - ID:', issueId, 'user:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Obtener el issue y verificar permisos
    const issueResult = await db.query(
      `SELECT i.*, r.owner_id as repo_owner_id 
       FROM issues i
       JOIN repositories r ON i.repository_id = r.id
       WHERE i.id = $1`,
      [issueId]
    );
    
    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Issue no encontrado' });
    }
    
    const issue = issueResult.rows[0];
    const isRepoOwner = issue.repo_owner_id === parseInt(userId);
    
    // Solo el dueño del repo o un maintainer puede modificar el issue
    if (!isRepoOwner) {
      const hasAccess = await checkPermission(issue.repository_id, userId, 'manage');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes permiso para modificar este issue' });
      }
    }

    // Construir la actualización dinámicamente
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title.trim());
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      
      if (status === 'closed') {
        updates.push(`closed_at = NOW()`);
        updates.push(`closed_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      } else if (status === 'open' || status === 'in_progress') {
        updates.push(`closed_at = NULL`);
        updates.push(`closed_by = NULL`);
      }
      paramIndex++;
    }
    
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }
    
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(assigned_to || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(issueId);
    
    const query = `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await db.query(query, values);

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'update_issue',
      actionType: 'update',
      repositoryId: issue.repository_id,
      details: { issueId: issueId, changes: req.body }
    }, req);

    res.json({ 
      success: true, 
      message: 'Issue actualizado correctamente',
      issue: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OBTENER COMENTARIOS DE UN ISSUE
// GET /api/issues/:issueId/comments
router.get('/:issueId/comments', async (req, res) => {
  const { issueId } = req.params;
  const userId = req.headers['user-id'];

  console.log('💬 GET issue comments - issue:', issueId);

  try {
    // Verificar que el issue existe y obtener su visibilidad
    const issueResult = await db.query(
      `SELECT i.*, r.visibility, r.owner_id as repo_owner_id
       FROM issues i
       JOIN repositories r ON i.repository_id = r.id
       WHERE i.id = $1`,
      [issueId]
    );
    
    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    
    const issue = issueResult.rows[0];
    
    // Si es público, cualquiera puede ver los comentarios
    if (issue.visibility === 'public') {
      const result = await db.query(
        `SELECT c.*, u.username, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.issue_id = $1
         ORDER BY c.created_at ASC`,
        [issueId]
      );
      return res.json(result.rows);
    }
    
    // Si es privado, verificar autenticación y permisos
    if (!userId) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    
    const isOwner = issue.repo_owner_id === parseInt(userId);
    
    if (!isOwner) {
      const hasAccess = await checkPermission(issue.repository_id, userId, 'view');
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta incidencia' });
      }
    }

    const result = await db.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.issue_id = $1
       ORDER BY c.created_at ASC`,
      [issueId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AGREGAR COMENTARIO A UN ISSUE
// POST /api/issues/:issueId/comments
router.post('/:issueId/comments', async (req, res) => {
  const { issueId } = req.params;
  const { content } = req.body;
  const userId = req.headers['user-id'];

  console.log('💬 POST issue comment - issue:', issueId, 'user:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  try {
    // Verificar que el issue existe
    const issueResult = await db.query(
      `SELECT i.*, r.visibility, r.owner_id as repo_owner_id
       FROM issues i
       JOIN repositories r ON i.repository_id = r.id
       WHERE i.id = $1`,
      [issueId]
    );
    
    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    
    const issue = issueResult.rows[0];
    
    // Si es público, cualquier usuario logueado puede comentar
    // Si es privado, verificar permisos
    if (issue.visibility !== 'public') {
      const isOwner = issue.repo_owner_id === parseInt(userId);
      if (!isOwner) {
        const hasAccess = await checkPermission(issue.repository_id, userId, 'view');
        if (!hasAccess) {
          return res.status(403).json({ error: 'No tienes acceso a esta incidencia' });
        }
      }
    }

    // Crear comentario
    const result = await db.query(
      `INSERT INTO comments (issue_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [issueId, userId, content.trim()]
    );

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'comment_issue',
      actionType: 'create',
      repositoryId: issue.repository_id,
      details: { issueId: issueId, commentId: result.rows[0].id }
    }, req);
    await notificationService.notifyComment(issueId, userId, userId, content);

    res.status(201).json({ 
      success: true, 
      message: 'Comentario agregado',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;