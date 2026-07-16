const db = require('../db');

/**
 * Registra una actividad en la base de datos
 * @param {Object} params - Parámetros de la actividad
 * @param {number} params.userId - ID del usuario que realiza la acción
 * @param {string} params.action - Nombre de la acción (ej: 'create_repo')
 * @param {string} params.actionType - Tipo de acción (create, update, delete, view, download, star, fork, comment)
 * @param {number} params.repositoryId - ID del repositorio relacionado (opcional)
 * @param {number} params.fileId - ID del archivo relacionado (opcional)
 * @param {Object} params.details - Detalles adicionales en JSON (opcional)
 * @param {string} req - Request object (para obtener IP y User-Agent)
 */
async function logActivity({ userId, action, actionType, repositoryId = null, fileId = null, details = null }, req = null) {
  try {
    const ipAddress = req ? req.ip || req.connection?.remoteAddress || null : null;
    const userAgent = req ? req.headers['user-agent'] || null : null;

    const query = `
      INSERT INTO activity_log (user_id, action, action_type, repository_id, file_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await db.query(query, [userId, action, actionType, repositoryId, fileId, details, ipAddress, userAgent]);
    console.log(`📝 [ACTIVITY] ${action} - User: ${userId} - Repo: ${repositoryId || 'N/A'}`);
  } catch (error) {
    console.error('Error al registrar actividad:', error);
  }
}

module.exports = { logActivity };