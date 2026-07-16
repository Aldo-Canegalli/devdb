const express = require('express');
const db = require('../db');
const notificationService = require('../services/notificationService');
const router = express.Router();

// ============================================
// OBTENER NOTIFICACIONES DEL USUARIO
// GET /api/notifications
// ============================================
router.get('/', async (req, res) => {
    const userId = req.headers['user-id'];
    const { limit = 50, unreadOnly = 'false' } = req.query;

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const notifications = await notificationService.getUserNotifications(
            userId,
            parseInt(limit),
            unreadOnly === 'true'
        );
        const unreadCount = await notificationService.getUnreadCount(userId);
        
        res.json({
            notifications,
            unreadCount,
            total: notifications.length
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// OBTENER CONTADOR DE NO LEÍDAS
// GET /api/notifications/unread-count
// ============================================
router.get('/unread-count', async (req, res) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.json({ count: 0 });
    }

    try {
        const count = await notificationService.getUnreadCount(userId);
        res.json({ count });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MARCAR NOTIFICACIÓN COMO LEÍDA
// PUT /api/notifications/:id/read
// ============================================
router.put('/:id/read', async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const notification = await notificationService.markAsRead(id, userId);
        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json({ success: true, notification });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MARCAR TODAS COMO LEÍDAS
// PUT /api/notifications/read-all
// ============================================
router.put('/read-all', async (req, res) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        await notificationService.markAllAsRead(userId);
        res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ELIMINAR NOTIFICACIONES VIEJAS
// DELETE /api/notifications/cleanup
// ============================================
router.delete('/cleanup', async (req, res) => {
    const userId = req.headers['user-id'];
    const { days = 30 } = req.query;

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const result = await notificationService.deleteOldNotifications(userId, parseInt(days));
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ELIMINAR UNA NOTIFICACIÓN ESPECÍFICA
// DELETE /api/notifications/:id
// ============================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const result = await db.query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        
        res.json({ success: true, message: 'Notificación eliminada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;