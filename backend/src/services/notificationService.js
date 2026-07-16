const db = require('../db');

// Tipos de notificaciones disponibles
const TYPES = {
    STAR: 'estrella',
    FORK: 'fork',
    COMMENT: 'comentario',
    PULL_REQUEST: 'solicitud_fusion',
    ISSUE: 'incidencia',
    INVITE: 'invitacion',
    MENTION: 'mencion',
    SEGUIDOR: 'seguidor',      
    NEW_REPO: 'nuevo_repo',
    MENSAJE: 'mensaje'    
};

/**
 * Crear una notificación para un usuario
 */
async function createNotification({ 
    userId,           // ID del usuario que recibe la notificación
    type,             // Tipo de notificación (de TYPES)
    title,            // Título de la notificación
    message,          // Mensaje detallado
    relatedUserId,    // ID del usuario que realizó la acción (opcional)
    relatedRepoId,    // ID del repositorio relacionado (opcional)
    relatedIssueId,   // ID del issue relacionado (opcional)
    relatedPrId,      // ID del PR relacionado (opcional)
    link              // URL para redirigir (opcional)
}) {
    try {
        const result = await db.query(
            `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_repository_id, related_issue_id, related_pr_id, link)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, type, title, message, relatedUserId, relatedRepoId, relatedIssueId, relatedPrId, link || null]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error al crear notificación:', error);
        throw error;
    }
}

/**
 * Marcar notificaciones como leídas
 */
async function markAsRead(notificationId, userId) {
    try {
        const result = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, read_at = NOW()
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [notificationId, userId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        throw error;
    }
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
async function markAllAsRead(userId) {
    try {
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, read_at = NOW()
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );
        return { success: true };
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        throw error;
    }
}

/**
 * Obtener notificaciones de un usuario
 */
async function getUserNotifications(userId, limit = 50, unreadOnly = false) {
    try {
        let query = `
            SELECT n.*, 
                   u1.username as actor_username,
                   r.name as repo_name,
                   i.title as issue_title,
                   pr.title as pr_title
            FROM notifications n
            LEFT JOIN users u1 ON n.related_user_id = u1.id
            LEFT JOIN repositories r ON n.related_repository_id = r.id
            LEFT JOIN issues i ON n.related_issue_id = i.id
            LEFT JOIN pull_requests pr ON n.related_pr_id = pr.id
            WHERE n.user_id = $1
        `;
        
        const params = [userId];
        
        if (unreadOnly) {
            query += ` AND n.is_read = FALSE`;
        }
        
        query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        throw error;
    }
}

/**
 * Contar notificaciones no leídas de un usuario
 */
async function getUnreadCount(userId) {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count 
             FROM notifications 
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error('Error al contar notificaciones:', error);
        return 0;
    }
}

/**
 * Eliminar notificaciones viejas (más de 30 días)
 */
async function deleteOldNotifications(userId, days = 30) {
    try {
        const result = await db.query(
            `DELETE FROM notifications 
             WHERE user_id = $1 AND created_at < NOW() - INTERVAL '${days} days'`,
            [userId]
        );
        return { deleted: result.rowCount };
    } catch (error) {
        console.error('Error al eliminar notificaciones viejas:', error);
        throw error;
    }
}

// Funciones helper para crear notificaciones específicas

/**
 * Notificación de estrella
 */
async function notifyStar(repoId, userId, actorId) {
    const repo = await db.query(`SELECT owner_id, name FROM repositories WHERE id = $1`, [repoId]);
    if (repo.rows.length === 0) return null;
    
    const ownerId = repo.rows[0].owner_id;
    if (ownerId === parseInt(actorId)) return null; // No notificar si se da estrella a sí mismo
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    return await createNotification({
        userId: ownerId,
        type: TYPES.STAR,
        title: '⭐ Nueva estrella',
        message: `@${actor.rows[0].username} dio estrella a tu repositorio "${repo.rows[0].name}"`,
        relatedUserId: actorId,
        relatedRepoId: repoId,
        link: `/repo/${repoId}`
    });
}

/**
 * Notificación de fork
 */
async function notifyFork(repoId, userId, actorId) {
    const repo = await db.query(`SELECT owner_id, name FROM repositories WHERE id = $1`, [repoId]);
    if (repo.rows.length === 0) return null;
    
    const ownerId = repo.rows[0].owner_id;
    if (ownerId === parseInt(actorId)) return null;
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    return await createNotification({
        userId: ownerId,
        type: TYPES.FORK,
        title: '🍴 Nuevo fork',
        message: `@${actor.rows[0].username} hizo fork de tu repositorio "${repo.rows[0].name}"`,
        relatedUserId: actorId,
        relatedRepoId: repoId,
        link: `/repo/${repoId}`
    });
}

/**
 * Notificación de comentario en issue
 */
async function notifyComment(issueId, userId, actorId, commentContent) {
    const issue = await db.query(
        `SELECT i.*, r.name as repo_name, u.username as issue_creator 
         FROM issues i
         JOIN repositories r ON i.repository_id = r.id
         JOIN users u ON i.created_by = u.id
         WHERE i.id = $1`,
        [issueId]
    );
    if (issue.rows.length === 0) return null;
    
    const creatorId = issue.rows[0].created_by;
    if (creatorId === parseInt(actorId)) return null;
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    return await createNotification({
        userId: creatorId,
        type: TYPES.COMMENT,
        title: '💬 Nuevo comentario',
        message: `@${actor.rows[0].username} comentó en tu issue "${issue.rows[0].title}"`,
        relatedUserId: actorId,
        relatedRepoId: issue.rows[0].repository_id,
        relatedIssueId: issueId,
        link: `/incidencia/${issueId}`
    });
}

/**
 * Notificación de creación de issue
 */
async function notifyIssue(repoId, userId, actorId, issueTitle) {
    const repo = await db.query(`SELECT owner_id, name FROM repositories WHERE id = $1`, [repoId]);
    if (repo.rows.length === 0) return null;
    
    const ownerId = repo.rows[0].owner_id;
    if (ownerId === parseInt(actorId)) return null;
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    const issueResult = await db.query(`SELECT id FROM issues WHERE title = $1 AND repository_id = $2 ORDER BY created_at DESC LIMIT 1`, [issueTitle, repoId]);
    const issueId = issueResult.rows[0]?.id;
    
    return await createNotification({
        userId: ownerId,
        type: TYPES.ISSUE,
        title: '🐛 Nueva incidencia',
        message: `@${actor.rows[0].username} creó una incidencia en tu repositorio "${repo.rows[0].name}"`,
        relatedUserId: actorId,
        relatedRepoId: repoId,
        relatedIssueId: issueId,
        link: `/incidencia/${issueId}`
    });
}

/**
 * Notificación de invitación a colaborador
 */
async function notifyInvite(repoId, userId, actorId) {
    const repo = await db.query(`SELECT name FROM repositories WHERE id = $1`, [repoId]);
    if (repo.rows.length === 0) return null;
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    return await createNotification({
        userId: userId,
        type: TYPES.INVITE,
        title: '👥 Invitación a colaborar',
        message: `@${actor.rows[0].username} te invitó a colaborar en "${repo.rows[0].name}"`,
        relatedUserId: actorId,
        relatedRepoId: repoId,
        link: `/repo/${repoId}`
    });
}

/**
 * Notificación de Pull Request
 */
async function notifyPullRequest(repoId, userId, actorId, prTitle, prId) {
    const repo = await db.query(`SELECT owner_id, name FROM repositories WHERE id = $1`, [repoId]);
    if (repo.rows.length === 0) return null;
    
    const ownerId = repo.rows[0].owner_id;
    if (ownerId === parseInt(actorId)) return null;
    
    const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
    
    return await createNotification({
        userId: ownerId,
        type: TYPES.PULL_REQUEST,
        title: '🔀 Nueva solicitud de fusión',
        message: `@${actor.rows[0].username} creó un Pull Request "${prTitle}" en tu repositorio "${repo.rows[0].name}"`,
        relatedUserId: actorId,
        relatedRepoId: repoId,
        relatedPrId: prId,
        link: `/pull/${prId}`
    });
}

async function notifyPullRequest(repoId, userId, actorId, prTitle, prId) {
  const repo = await db.query(`SELECT owner_id, name FROM repositories WHERE id = $1`, [repoId]);
  if (repo.rows.length === 0) return null;
  
  const ownerId = repo.rows[0].owner_id;
  if (ownerId === parseInt(actorId)) return null;
  
  const actor = await db.query(`SELECT username FROM users WHERE id = $1`, [actorId]);
  
  return await createNotification({
    userId: ownerId,
    type: 'solicitud_fusion',
    title: '🔀 Nueva solicitud de fusión',
    message: `@${actor.rows[0].username} creó un Pull Request "${prTitle}" en tu repositorio "${repo.rows[0].name}"`,
    relatedUserId: actorId,
    relatedRepoId: repoId,
    relatedPrId: prId,
    link: `/pull/${prId}`
  });
}

module.exports = {
    TYPES,
    createNotification,
    markAsRead,
    markAllAsRead,
    getUserNotifications,
    getUnreadCount,
    deleteOldNotifications,
    notifyStar,
    notifyFork,
    notifyComment,
    notifyIssue,
    notifyInvite,
    notifyPullRequest
};