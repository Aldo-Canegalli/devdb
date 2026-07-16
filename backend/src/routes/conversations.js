const express = require('express');
const db = require('../db');
const router = express.Router();

// ============================================
// OBTENER TODAS LAS CONVERSACIONES DE UN USUARIO
// GET /api/conversations
// ============================================
router.get('/', async (req, res) => {
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await db.query(`
      SELECT 
        c.*,
        u.id as other_user_id,
        u.username as other_user_name,
        u.avatar_url as other_user_avatar,
        COUNT(m.id) FILTER (WHERE m.is_read = false AND m.sender_id != $1) as unread_count
      FROM conversations c
      JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id) AND u.id != $1
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      GROUP BY c.id, u.id, u.username, u.avatar_url
      ORDER BY c.last_message_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER UNA CONVERSACIÓN ESPECÍFICA
// GET /api/conversations/:userId
// ============================================
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.headers['user-id'];

  if (!currentUserId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Obtener o crear conversación
    let conversation = await db.query(`
      SELECT * FROM conversations
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [currentUserId, userId]);

    if (conversation.rows.length === 0) {
      // Crear nueva conversación
      conversation = await db.query(`
        INSERT INTO conversations (user1_id, user2_id)
        VALUES ($1, $2)
        RETURNING *
      `, [currentUserId, userId]);
    }

    // Obtener mensajes
    const messages = await db.query(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversation.rows[0].id]);

    // Marcar mensajes como leídos
    await db.query(`
      UPDATE messages 
      SET is_read = true, read_at = NOW()
      WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
    `, [conversation.rows[0].id, currentUserId]);

    res.json({
      conversation: conversation.rows[0],
      messages: messages.rows
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;