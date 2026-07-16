const { logActivity } = require('../middleware/activityLogger');
const express = require('express');
const db = require('../db');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Función para verificar permisos de un usuario en un repositorio
async function checkPermission(repoId, userId, requiredPermission) {
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

// Función para obtener etiquetas de un repositorio
async function getRepoTags(repoId) {
  const result = await db.query(
    `SELECT t.name FROM tags t
     JOIN repository_tags rt ON rt.tag_id = t.id
     WHERE rt.repository_id = $1
     ORDER BY t.name ASC`,
    [repoId]
  );
  return result.rows.map(r => r.name);
}

// ============================================
// 1. RUTAS ESPECÍFICAS (PRIMERO)
// ============================================

// Obtener etiquetas populares
router.get('/tags/popular', async (req, res) => {
  const { limit = 10 } = req.query;
  
  try {
    // Verificar si la tabla tags existe
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tags'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json([]);
    }
    
    const result = await db.query(
      `SELECT t.id, t.name, t.color, COUNT(rt.repository_id) as count
       FROM tags t
       LEFT JOIN repository_tags rt ON rt.tag_id = t.id
       GROUP BY t.id, t.name, t.color
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.json([]);
  }
});

// Búsqueda avanzada de repositorios
router.get('/search', async (req, res) => {
  const { 
    q = '', 
    type, 
    user, 
    tag, 
    sort = 'recent', 
    order = 'DESC',
    limit = 20,
    offset = 0
  } = req.query;

  try {
    let query = `
      SELECT DISTINCT r.*, 
             u.username as owner_name,
             (SELECT COUNT(*) FROM stars s WHERE s.repository_id = r.id) as stars_count,
             (SELECT COUNT(*) FROM forks f WHERE f.original_repo_id = r.id) as forks_count
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Solo repositorios públicos
    conditions.push(`r.visibility = 'public'`);
    
    // Búsqueda por texto
    if (q && q.trim().length > 0) {
      conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }
    
    // Filtro por tipo
    if (type && ['game', 'code', 'txt', 'mixed'].includes(type)) {
      conditions.push(`r.repo_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    // Filtro por usuario
    if (user && user.trim().length > 0) {
      conditions.push(`u.username ILIKE $${paramIndex}`);
      params.push(`%${user.trim()}%`);
      paramIndex++;
    }
    
    // Filtro por etiqueta
    if (tag && tag.trim().length > 0) {
      query += ` JOIN repository_tags rt ON rt.repository_id = r.id
                 JOIN tags t ON t.id = rt.tag_id`;
      conditions.push(`t.name ILIKE $${paramIndex}`);
      params.push(`%${tag.trim()}%`);
      paramIndex++;
    }
    
    // Agregar condiciones
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Ordenar
    const sortMap = {
      'recent': 'r.created_at DESC',
      'stars': 'stars_count DESC',
      'forks': 'forks_count DESC',
      'name': 'r.name ASC',
      'popular': 'stars_count DESC, forks_count DESC'
    };
    
    const orderClause = sortMap[sort] || 'r.created_at DESC';
    query += ` ORDER BY ${orderClause}`;
    
    // Paginación
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);
    paramIndex++;
    
    query += ` OFFSET $${paramIndex}`;
    params.push(offset);
    
    // Ejecutar consulta
    const result = await db.query(query, params);
    
    // Obtener total
    let countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
    `;
    
    // Si hay filtro por tag, agregar JOINs al count
    if (tag && tag.trim().length > 0) {
      countQuery += ` JOIN repository_tags rt ON rt.repository_id = r.id
                      JOIN tags t ON t.id = rt.tag_id`;
    }
    
    const countConditions = [];
    const countParams = [];
    let countIndex = 1;
    
    countConditions.push(`r.visibility = 'public'`);
    
    if (q && q.trim().length > 0) {
      countConditions.push(`(r.name ILIKE $${countIndex} OR r.description ILIKE $${countIndex})`);
      countParams.push(`%${q.trim()}%`);
      countIndex++;
    }
    
    if (type && ['game', 'code', 'txt', 'mixed'].includes(type)) {
      countConditions.push(`r.repo_type = $${countIndex}`);
      countParams.push(type);
      countIndex++;
    }
    
    if (user && user.trim().length > 0) {
      countConditions.push(`u.username ILIKE $${countIndex}`);
      countParams.push(`%${user.trim()}%`);
      countIndex++;
    }
    
    if (tag && tag.trim().length > 0) {
      countConditions.push(`t.name ILIKE $${countIndex}`);
      countParams.push(`%${tag.trim()}%`);
      countIndex++;
    }
    
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    // Obtener etiquetas para cada repositorio
    const reposWithTags = await Promise.all(result.rows.map(async (repo) => {
      const tags = await getRepoTags(repo.id);
      return { ...repo, tags };
    }));
    
    res.json({
      success: true,
      data: reposWithTags,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      },
      filters: { q, type, user, tag, sort, order }
    });
    
  } catch (error) {
    console.error('Error en búsqueda avanzada:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Obtener repositorios (tienda pública o biblioteca del usuario)
router.get('/', async (req, res) => {
  const { owner } = req.query;
  const userId = req.headers['user-id'];
  
  try {
    // Si se pide por owner (biblioteca del usuario)
    if (owner) {
      // Obtener repositorios donde es dueño O colaborador
      const result = await db.query(
        `SELECT DISTINCT 
          r.*, 
          u.username as owner_name,
          CASE WHEN r.owner_id = $1 THEN true ELSE false END as is_owner,
          COALESCE(c.role, 'none') as collaborator_role
         FROM repositories r
         JOIN users u ON r.owner_id = u.id
         LEFT JOIN collaborators c ON c.repository_id = r.id AND c.user_id = $1 AND c.accepted_at IS NOT NULL
         WHERE r.owner_id = $1 OR (c.user_id = $1 AND c.accepted_at IS NOT NULL)
         ORDER BY r.created_at DESC`,
        [owner]
      );
      
      // Obtener etiquetas para cada repositorio
      const reposWithTags = await Promise.all(result.rows.map(async (repo) => {
        const tags = await getRepoTags(repo.id);
        return { ...repo, tags };
      }));
      
      return res.json(reposWithTags);
    }
    
    // Si no, mostrar repositorios públicos (tienda)
    const result = await db.query(
      `SELECT r.*, u.username as owner_name 
       FROM repositories r 
       JOIN users u ON r.owner_id = u.id 
       WHERE r.visibility = 'public'
       ORDER BY r.created_at DESC`
    );
    
    // Obtener etiquetas para cada repositorio
    const reposWithTags = await Promise.all(result.rows.map(async (repo) => {
      const tags = await getRepoTags(repo.id);
      return { ...repo, tags };
    }));
    
    res.json(reposWithTags);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear repositorio
router.post('/', async (req, res) => {
  const { name, description, repo_type, visibility, tags = [] } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const result = await db.query(
      `INSERT INTO repositories (name, description, repo_type, visibility, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, repo_type, visibility, userId]
    );
    
    // Agregar etiquetas si hay
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        if (!tagName || tagName.trim().length === 0) continue;

        const normalizedName = tagName.trim().toLowerCase();

        // Buscar o crear etiqueta
        let tagResult = await db.query(
          `SELECT id FROM tags WHERE LOWER(name) = LOWER($1)`,
          [normalizedName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await db.query(
            `INSERT INTO tags (name) VALUES ($1) RETURNING id`,
            [normalizedName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await db.query(
          `INSERT INTO repository_tags (repository_id, tag_id) VALUES ($1, $2)
           ON CONFLICT (repository_id, tag_id) DO NOTHING`,
          [result.rows[0].id, tagId]
        );
      }
    }

    await logActivity({
      userId: userId,
      action: 'create_repo',
      actionType: 'create',
      repositoryId: result.rows[0].id,
      details: { name, repo_type, visibility, tags }
    }, req);

    // Devolver el repositorio con sus etiquetas
    const newRepo = result.rows[0];
    const repoTags = await getRepoTags(newRepo.id);
    newRepo.tags = repoTags;

    res.status(201).json(newRepo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 2. RUTAS CON PARÁMETROS (DESPUÉS)
// ============================================

// Obtener un repositorio específico
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];

  try {
    const result = await db.query(
      `SELECT r.*, u.username as owner_name 
       FROM repositories r 
       JOIN users u ON r.owner_id = u.id 
       WHERE r.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }
    
    const repo = result.rows[0];
    
    // Verificar acceso si es privado
    if (repo.visibility !== 'public') {
      if (!userId) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
      }
      
      const isOwner = repo.owner_id === parseInt(userId);
      
      if (!isOwner) {
        const collabCheck = await db.query(
          `SELECT * FROM collaborators 
           WHERE repository_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
          [id, userId]
        );
        
        if (collabCheck.rows.length === 0) {
          return res.status(403).json({ error: 'No tienes acceso a este repositorio' });
        }
      }
    }
    
    // Obtener etiquetas del repositorio
    const tags = await getRepoTags(id);
    repo.tags = tags;
    
    res.json(repo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dar estrella a un repositorio
router.post('/:id/star', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];

  try {
    await db.query(
      `INSERT INTO stars (user_id, repository_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, id]
    );
    await db.query(
      `UPDATE repositories SET stars_count = stars_count + 1 WHERE id = $1`,
      [id]
    );
    await logActivity({
      userId: userId,
      action: 'star_repo',
      actionType: 'star',
      repositoryId: id
    }, req);

    await notificationService.notifyStar(id, userId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Quitar estrella
router.delete('/:id/star', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];

  try {
    await db.query(
      `DELETE FROM stars WHERE user_id = $1 AND repository_id = $2`,
      [userId, id]
    );
    await db.query(
      `UPDATE repositories SET stars_count = stars_count - 1 WHERE id = $1`,
      [id]
    );
    await logActivity({
      userId: userId,
      action: 'unstar_repo',
      actionType: 'star',
      repositoryId: id,
      details: { removed: true }
    }, req);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar si usuario dio estrella
router.get('/:id/star', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];

  try {
    const result = await db.query(
      `SELECT * FROM stars WHERE user_id = $1 AND repository_id = $2`,
      [userId, id]
    );
    res.json({ starred: result.rows.length > 0 });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;