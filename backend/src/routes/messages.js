const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const notificationService = require('../services/notificationService');
const router = express.Router();

// ============================================
// ENVIAR UN MENSAJE
// POST /api/messages
// ============================================
router.post('/', async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.headers['user-id'];

  if (!senderId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!receiverId || !content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Destinatario y contenido son requeridos' });
  }

  if (parseInt(senderId) === parseInt(receiverId)) {
    return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });
  }

  try {
    // Verificar que el receptor existe
    const userCheck = await db.query(`SELECT id, username FROM users WHERE id = $1`, [receiverId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener o crear conversación
    let conversation = await db.query(`
      SELECT * FROM conversations
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [senderId, receiverId]);

    if (conversation.rows.length === 0) {
      conversation = await db.query(`
        INSERT INTO conversations (user1_id, user2_id)
        VALUES ($1, $2)
        RETURNING *
      `, [senderId, receiverId]);
    }

    const conversationId = conversation.rows[0].id;

    // Insertar mensaje
    const result = await db.query(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [conversationId, senderId, content.trim()]);

    // Actualizar última actividad de la conversación
    await db.query(`
      UPDATE conversations 
      SET last_message = $1, last_message_at = NOW()
      WHERE id = $2
    `, [content.trim(), conversationId]);

    // Registrar actividad
    await logActivity({
      userId: senderId,
      action: 'send_message',
      actionType: 'create',
      details: { receiverId }
    }, req);

    // Crear notificación para el receptor
    try {
      const sender = await db.query(`SELECT username FROM users WHERE id = $1`, [senderId]);
      await notificationService.createNotification({
        userId: receiverId,
        type: 'mensaje',
        title: '💬 Nuevo mensaje',
        message: `@${sender.rows[0].username} te envió un mensaje`,
        relatedUserId: senderId,
        link: `/mensajes/${senderId}`
      });
    } catch (notifError) {
      console.log('Notificación no enviada:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER MENSAJES DE UNA CONVERSACIÓN
// GET /api/messages/conversation/:conversationId
// ============================================
router.get('/conversation/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Verificar que el usuario pertenece a la conversación
    const convCheck = await db.query(`
      SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
    `, [conversationId, userId]);

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    const messages = await db.query(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);

    // Marcar mensajes como leídos
    await db.query(`
      UPDATE messages 
      SET is_read = true, read_at = NOW()
      WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
    `, [conversationId, userId]);

    res.json(messages.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MARCAR MENSAJE COMO LEÍDO
// PUT /api/messages/:messageId/read
// ============================================
router.put('/:messageId/read', async (req, res) => {
  const { messageId } = req.params;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    await db.query(`
      UPDATE messages 
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND sender_id != $2
    `, [messageId, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONTAR MENSAJES NO LEÍDOS
// GET /api/messages/unread-count
// ============================================
router.get('/unread-count', async (req, res) => {
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.json({ count: 0 });
  }

  try {
    const result = await db.query(`
      SELECT COUNT(*) as count FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.user1_id = $1 OR c.user2_id = $1) AND m.sender_id != $1 AND m.is_read = false
    `, [userId]);

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;