const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const notificationService = require('../services/notificationService');
const router = express.Router();

// ============================================
// SEGUIR A UN USUARIO
// POST /api/follows/:userId
// ============================================
// SEGUIR A UN USUARIO
router.post('/:userId', async (req, res) => {
  const { userId } = req.params;  // Usuario a seguir
  const followerId = req.headers['user-id'];  // Usuario que sigue

  if (!followerId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (parseInt(followerId) === parseInt(userId)) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
  }

  try {
    // Verificar que el usuario existe
    const userCheck = await db.query(`SELECT id, username FROM users WHERE id = $1`, [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya lo sigue
    const followCheck = await db.query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, userId]
    );

    if (followCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ya sigues a este usuario' });
    }

    // Crear seguimiento
    await db.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`,
      [followerId, userId]
    );

    // Registrar actividad (intentar, pero no fallar si hay error)
    try {
      await logActivity({
        userId: followerId,
        action: 'follow_user',
        actionType: 'create',
        details: { followingUserId: userId }
      }, req);
    } catch (logError) {
      console.log('Error en logActivity (no crítico):', logError.message);
    }

    // Intentar crear notificación (si falla, no importa)
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.createNotification({
        userId: userId,
        type: 'seguidor',
        title: '👥 Nuevo seguidor',
        message: `@${userCheck.rows[0].username} comenzó a seguirte`,
        relatedUserId: followerId,
        link: `/perfil/${userCheck.rows[0].username}`
      });
    } catch (notifError) {
      console.log('Notificación no enviada (no crítico):', notifError.message);
    }

    res.json({
      success: true,
      message: 'Ahora sigues a este usuario'
    });
  } catch (error) {
    console.error('Error en follow:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEJAR DE SEGUIR A UN USUARIO
// DELETE /api/follows/:userId
// ============================================
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;  // Usuario a dejar de seguir
  const followerId = req.headers['user-id'];  // Usuario que deja de seguir

  if (!followerId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await db.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *`,
      [followerId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No sigues a este usuario' });
    }

    await logActivity({
      userId: followerId,
      action: 'unfollow_user',
      actionType: 'delete',
      details: { followingUserId: userId }
    }, req);

    res.json({
      success: true,
      message: 'Dejaste de seguir a este usuario'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER SEGUIDORES DE UN USUARIO
// GET /api/follows/:userId/followers
// ============================================
router.get('/:userId/followers', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as followed_since,
        EXISTS (
          SELECT 1 FROM follows f2 
          WHERE f2.follower_id = $1 AND f2.following_id = u.id
        ) as is_following_back
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER USUARIOS QUE SIGUE UN USUARIO
// GET /api/follows/:userId/following
// ============================================
router.get('/:userId/following', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as followed_since,
        EXISTS (
          SELECT 1 FROM follows f2 
          WHERE f2.follower_id = u.id AND f2.following_id = $1
        ) as follows_back
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER AMIGOS (SEGUIMIENTO MUTUO)
// GET /api/follows/:userId/friends
// ============================================
router.get('/:userId/friends', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as friend_since,
        EXISTS (
          SELECT 1 FROM repositories r 
          WHERE r.owner_id = u.id AND r.created_at > NOW() - INTERVAL '24 hours'
        ) as has_new_repo
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      AND EXISTS (
        SELECT 1 FROM follows f2 
        WHERE f2.follower_id = u.id AND f2.following_id = $1
      )
      ORDER BY f.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONTAR SEGUIDORES, SEGUIDOS Y AMIGOS
// GET /api/follows/:userId/counts
// ============================================
router.get('/:userId/counts', async (req, res) => {
  const { userId } = req.params;

  try {
    const followersResult = await db.query(
      `SELECT COUNT(*) FROM follows WHERE following_id = $1`,
      [userId]
    );

    const followingResult = await db.query(
      `SELECT COUNT(*) FROM follows WHERE follower_id = $1`,
      [userId]
    );

    const friendsResult = await db.query(`
      SELECT COUNT(*) FROM follows f
      WHERE f.follower_id = $1
      AND EXISTS (
        SELECT 1 FROM follows f2 
        WHERE f2.follower_id = f.following_id AND f2.following_id = $1
      )
    `, [userId]);

    res.json({
      followers: parseInt(followersResult.rows[0].count),
      following: parseInt(followingResult.rows[0].count),
      friends: parseInt(friendsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VERIFICAR RELACIÓN ENTRE DOS USUARIOS
// GET /api/follows/relation/:userId
// ============================================
router.get('/relation/:userId', async (req, res) => {
  const { userId } = req.params;  // Usuario a verificar
  const currentUserId = req.headers['user-id'];  // Usuario logueado

  if (!currentUserId) {
    return res.json({
      isFollowing: false,
      isFollowed: false,
      isFriend: false
    });
  }

  try {
    // Verificar si el usuario logueado sigue a userId
    const followingResult = await db.query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, userId]
    );

    // Verificar si userId sigue al usuario logueado
    const followedResult = await db.query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, currentUserId]
    );

    const isFollowing = followingResult.rows.length > 0;
    const isFollowed = followedResult.rows.length > 0;

    res.json({
      isFollowing,
      isFollowed,
      isFriend: isFollowing && isFollowed
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ELIMINAR SEGUIDOR (desde el perfil del seguido)
// DELETE /api/follows/remove-follower/:userId
// ============================================
router.delete('/remove-follower/:userId', async (req, res) => {
  const { userId } = req.params;  // Usuario que quieres eliminar como seguidor
  const currentUserId = req.headers['user-id'];  // Usuario logueado (el dueño del perfil)

  if (!currentUserId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (parseInt(currentUserId) === parseInt(userId)) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio perfil' });
  }

  try {
    // Verificar que el usuario existe
    const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que este usuario te sigue a ti (currentUserId)
    const followCheck = await db.query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, currentUserId]
    );

    if (followCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Este usuario no te sigue' });
    }

    // Eliminar el seguimiento (borrar registro)
    await db.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, currentUserId]
    );

    // Si tú también lo seguías, eliminarlo también (opcional)
    // Esto simula el comportamiento de TikTok: eliminar seguidor = dejar de seguir mutuamente
    await db.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, userId]
    );

    await logActivity({
      userId: currentUserId,
      action: 'remove_follower',
      actionType: 'delete',
      details: { removedUserId: userId }
    }, req);

    res.json({
      success: true,
      message: 'Seguidor eliminado correctamente'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER AMIGOS CON INDICADOR DE NUEVO REPO
// GET /api/follows/:userId/friends-with-activity
// ============================================
router.get('/:userId/friends-with-activity', async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as friend_since,
        EXISTS (
          SELECT 1 FROM repositories r 
          WHERE r.owner_id = u.id AND r.created_at > NOW() - INTERVAL '24 hours'
        ) as has_new_repo,
        (
          SELECT COUNT(*) FROM repositories r 
          WHERE r.owner_id = u.id AND r.created_at > NOW() - INTERVAL '7 days'
        ) as new_repos_count
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      AND EXISTS (
        SELECT 1 FROM follows f2 
        WHERE f2.follower_id = u.id AND f2.following_id = $1
      )
      ORDER BY has_new_repo DESC, f.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;