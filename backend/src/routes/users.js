const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();

// ============================================
// REGISTRAR USUARIO
// POST /api/users/register
// ============================================
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, password_hash]
    );
    
    // Registrar actividad
    await logActivity({
      userId: result.rows[0].id,
      action: 'register',
      actionType: 'create',
      details: { username, email }
    }, req);
    
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIAR SESIÓN
// POST /api/users/login
// ============================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Registrar actividad de login
    await logActivity({
      userId: user.id,
      action: 'login',
      actionType: 'view',
      details: { email }
    }, req);
    
    res.json({ 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      avatar_url: user.avatar_url 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER PERFIL DE UN USUARIO POR USERNAME
// GET /api/users/:username
// ============================================
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  const userId = req.headers['user-id'];

  try {
    // Obtener información del usuario
    const userResult = await db.query(
      `SELECT id, username, email, avatar_url, bio, created_at
       FROM users
       WHERE username = $1`,
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = userResult.rows[0];
    
    // Obtener estadísticas del usuario (SOLO PÚBLICOS)
    const statsResult = await db.query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_repos,
        COUNT(DISTINCT s.repository_id) as total_stars_received
      FROM users u
      LEFT JOIN repositories r ON r.owner_id = u.id AND r.visibility = 'public'
      LEFT JOIN stars s ON s.repository_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [user.id]);

    const stats = statsResult.rows[0] || {
      total_repos: 0,
      total_stars_received: 0
    };
    
    // Obtener contadores de seguidores y siguiendo
    const followsCount = await db.query(`
      SELECT 
        COUNT(DISTINCT f1.follower_id) as followers_count,
        COUNT(DISTINCT f1.following_id) as following_count
      FROM users u
      LEFT JOIN follows f1 ON f1.following_id = u.id
      LEFT JOIN follows f2 ON f2.follower_id = u.id
      WHERE u.id = $1
    `, [user.id]);

    const counts = followsCount.rows[0] || { followers_count: 0, following_count: 0 };
    
    // Obtener repositorios del usuario (solo públicos)
    const reposResult = await db.query(
      `SELECT r.*, 
              COUNT(DISTINCT s.user_id) as stars_count,
              COUNT(DISTINCT f.id) as forks_count
       FROM repositories r
       LEFT JOIN stars s ON s.repository_id = r.id
       LEFT JOIN forks f ON f.original_repo_id = r.id
       WHERE r.owner_id = $1 AND r.visibility = 'public'
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [user.id]
    );
    
    // Verificar si el usuario logueado sigue a este usuario
    let isFollowing = false;
    if (userId) {
      const followCheck = await db.query(
        `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [userId, user.id]
      );
      isFollowing = followCheck.rows.length > 0;
    }
    
    res.json({
      user,
      stats,
      repositories: reposResult.rows,
      isFollowing,
      isOwnProfile: userId ? parseInt(userId) === user.id : false,
      followersCount: parseInt(counts.followers_count || 0),
      followingCount: parseInt(counts.following_count || 0)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER USUARIO POR ID
// GET /api/users/id/:userId
// ============================================
router.get('/id/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT id, username, email, avatar_url, bio, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTUALIZAR PERFIL DE USUARIO
// PUT /api/users/profile
// ============================================
router.put('/profile', async (req, res) => {
  const userId = req.headers['user-id'];
  const { bio, avatar_url, display_name } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    let query = 'UPDATE users SET ';
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      values.push(bio);
      paramIndex++;
    }
    
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      values.push(avatar_url);
      paramIndex++;
    }
    
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex}`);
      values.push(display_name);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    values.push(userId);
    query += `${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, bio, avatar_url`;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Registrar actividad
    await logActivity({
      userId: userId,
      action: 'update_profile',
      actionType: 'update',
      details: { updatedFields: Object.keys(req.body) }
    }, req);
    
    res.json({ 
      success: true, 
      message: 'Perfil actualizado correctamente',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER ACTIVIDAD DE UN USUARIO
// GET /api/users/:userId/activity
// ============================================
router.get('/:userId/activity', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const result = await db.query(
      `SELECT a.*, 
              u.username as user_name,
              r.name as repo_name,
              f.file_name
       FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN repositories r ON a.repository_id = r.id
       LEFT JOIN files f ON a.file_id = f.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;