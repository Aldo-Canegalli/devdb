const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();

// ============================================
// OBTENER TODOS LOS HILOS DEL FORO
// GET /api/forum/threads
// ============================================
router.get('/threads', async (req, res) => {
  const { category, limit = 20, offset = 0 } = req.query;

  try {
    let query = `
      SELECT 
        t.*,
        u.username as author_name,
        COUNT(c.id) as comments_count,
        (SELECT COUNT(*) FROM forum_comments WHERE thread_id = t.id AND created_at > NOW() - INTERVAL '7 days') as recent_comments
      FROM forum_threads t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN forum_comments c ON c.thread_id = t.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      query += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` GROUP BY t.id, u.username ORDER BY t.is_pinned DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER UN HILO DEL FORO CON SUS COMENTARIOS
// GET /api/forum/threads/:threadId
// ============================================
router.get('/threads/:threadId', async (req, res) => {
  const { threadId } = req.params;

  try {
    // Obtener el hilo
    const threadResult = await db.query(`
      SELECT t.*, u.username as author_name
      FROM forum_threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.id = $1
    `, [threadId]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hilo no encontrado' });
    }

    // Incrementar vistas
    await db.query(`UPDATE forum_threads SET views = views + 1 WHERE id = $1`, [threadId]);

    // Obtener comentarios
    const commentsResult = await db.query(`
      SELECT c.*, u.username as author_name
      FROM forum_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.thread_id = $1
      ORDER BY c.created_at ASC
    `, [threadId]);

    res.json({
      thread: threadResult.rows[0],
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREAR UN NUEVO HILO EN EL FORO
// POST /api/forum/threads
// ============================================
router.post('/threads', async (req, res) => {
  const { title, content, category = 'general' } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  try {
    const result = await db.query(`
      INSERT INTO forum_threads (title, content, author_id, category)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title.trim(), content.trim(), userId, category]);

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'create_forum_thread',
      actionType: 'create',
      details: { threadId: result.rows[0].id, title: title.trim(), category }
    }, req);

    res.status(201).json({
      success: true,
      message: 'Hilo creado correctamente',
      thread: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AGREGAR COMENTARIO A UN HILO
// POST /api/forum/threads/:threadId/comments
// ============================================
router.post('/threads/:threadId/comments', async (req, res) => {
  const { threadId } = req.params;
  const { content } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  try {
    // Verificar que el hilo existe y no está bloqueado
    const threadCheck = await db.query(
      `SELECT id, is_locked FROM forum_threads WHERE id = $1`,
      [threadId]
    );

    if (threadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Hilo no encontrado' });
    }

    if (threadCheck.rows[0].is_locked) {
      return res.status(403).json({ error: 'Este hilo está bloqueado, no se pueden agregar comentarios' });
    }

    const result = await db.query(`
      INSERT INTO forum_comments (thread_id, author_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [threadId, userId, content.trim()]);

    // Actualizar fecha del hilo
    await db.query(`UPDATE forum_threads SET updated_at = NOW() WHERE id = $1`, [threadId]);

    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'comment_forum',
      actionType: 'create',
      details: { threadId, commentId: result.rows[0].id }
    }, req);

    // Obtener nombre del autor
    const authorResult = await db.query(
      `SELECT username FROM users WHERE id = $1`,
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Comentario agregado',
      comment: {
        ...result.rows[0],
        author_name: authorResult.rows[0]?.username || 'desconocido'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER CATEGORÍAS DEL FORO
// GET /api/forum/categories
// ============================================
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT category, COUNT(*) as thread_count
      FROM forum_threads
      GROUP BY category
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER PROYECTOS DESTACADOS
// GET /api/community/featured-projects
// ============================================
router.get('/featured-projects', async (req, res) => {
  const { limit = 6, type } = req.query;

  try {
    let query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.repo_type,
        r.created_at,
        u.username as owner_name,
        COUNT(DISTINCT s.user_id) as stars_count,
        COUNT(DISTINCT f.id) as forks_count,
        COUNT(DISTINCT c.id) as comments_count,
        ARRAY_AGG(DISTINCT t.name) as tags
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
      LEFT JOIN stars s ON s.repository_id = r.id
      LEFT JOIN forks f ON f.original_repo_id = r.id
      LEFT JOIN comments c ON c.repository_id = r.id
      LEFT JOIN repository_tags rt ON rt.repository_id = r.id
      LEFT JOIN tags t ON t.id = rt.tag_id
      WHERE r.visibility = 'public'
    `;

    const params = [];
    let paramIndex = 1;

    if (type && ['game', 'code', 'txt', 'mixed'].includes(type)) {
      query += ` AND r.repo_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += `
      GROUP BY r.id, u.username
      ORDER BY stars_count DESC, forks_count DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;