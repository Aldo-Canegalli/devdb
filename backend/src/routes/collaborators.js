const express = require('express');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();
const notificationService = require('../services/notificationService');

// ============================================
// OBTENER COLABORADORES DE UN REPOSITORIO
// GET /api/collaborators/repositories/:repoId
// ============================================
router.get('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;

  try {
    const result = await db.query(
      `SELECT c.*, u.username, u.email, u.avatar_url
       FROM collaborators c
       JOIN users u ON c.user_id = u.id
       WHERE c.repository_id = $1
       ORDER BY 
         CASE c.role 
           WHEN 'owner' THEN 1
           WHEN 'maintainer' THEN 2
           WHEN 'writer' THEN 3
           WHEN 'reader' THEN 4
           WHEN 'tester' THEN 5
         END`,
      [repoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVITAR COLABORADOR
// POST /api/collaborators/repositories/:repoId/invite
// ============================================
router.post('/repositories/:repoId/invite', async (req, res) => {
  const { repoId } = req.params;
  const { username, role } = req.body;
  const ownerId = req.headers['user-id'];

  if (!ownerId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Verificar que quien invita es el dueño del repositorio
    const repoCheck = await db.query(
      `SELECT owner_id FROM repositories WHERE id = $1`,
      [repoId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }

    if (repoCheck.rows[0].owner_id !== parseInt(ownerId)) {
      return res.status(403).json({ error: 'Solo el dueño puede invitar colaboradores' });
    }

    // Buscar al usuario por username
    const userResult = await db.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = userResult.rows[0].id;

    // Verificar que no sea el dueño
    if (userId === parseInt(ownerId)) {
      return res.status(400).json({ error: 'No puedes invitarte a ti mismo' });
    }

    // Verificar que no exista ya como colaborador
    const existingCheck = await db.query(
      `SELECT * FROM collaborators WHERE repository_id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya es colaborador' });
    }

    // Asignar permisos según el rol
    let permissions = ['view'];
    if (role === 'maintainer') permissions = ['view', 'download', 'upload', 'edit', 'manage'];
    else if (role === 'writer') permissions = ['view', 'download', 'upload', 'edit'];
    else if (role === 'reader') permissions = ['view', 'download'];
    else if (role === 'tester') permissions = ['view', 'report'];

    // Crear la invitación
    const result = await db.query(
      `INSERT INTO collaborators (repository_id, user_id, role, permissions, invited_by, accepted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [repoId, userId, role, permissions, ownerId]
    );

    // Registrar actividad
    await logActivity({
      userId: ownerId,
      action: 'invite_collaborator',
      actionType: 'create',
      repositoryId: repoId,
      details: { invitedUser: username, role }
    }, req);
  await notificationService.notifyInvite(repoId, userId, userId);

    res.json({ 
      success: true, 
      message: `Invitación enviada a ${username}`,
      collaborator: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTUALIZAR ROL DE COLABORADOR
// PUT /api/collaborators/repositories/:repoId/collaborators/:userId
// ============================================
router.put('/repositories/:repoId/collaborators/:userId', async (req, res) => {
  const { repoId, userId } = req.params;
  const { role } = req.body;
  const ownerId = req.headers['user-id'];

  try {
    // Verificar que quien modifica es el dueño
    const repoCheck = await db.query(
      `SELECT owner_id FROM repositories WHERE id = $1`,
      [repoId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }

    if (repoCheck.rows[0].owner_id !== parseInt(ownerId)) {
      return res.status(403).json({ error: 'Solo el dueño puede cambiar roles' });
    }

    // Asignar permisos según el rol
    let permissions = ['view'];
    if (role === 'maintainer') permissions = ['view', 'download', 'upload', 'edit', 'manage'];
    else if (role === 'writer') permissions = ['view', 'download', 'upload', 'edit'];
    else if (role === 'reader') permissions = ['view', 'download'];
    else if (role === 'tester') permissions = ['view', 'report'];

    const result = await db.query(
      `UPDATE collaborators 
       SET role = $1, permissions = $2
       WHERE repository_id = $3 AND user_id = $4
       RETURNING *`,
      [role, permissions, repoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    await logActivity({
      userId: ownerId,
      action: 'update_collaborator_role',
      actionType: 'update',
      repositoryId: repoId,
      details: { userId, newRole: role }
    }, req);

    res.json({ success: true, collaborator: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ELIMINAR COLABORADOR
// DELETE /api/collaborators/repositories/:repoId/collaborators/:userId
// ============================================
router.delete('/repositories/:repoId/collaborators/:userId', async (req, res) => {
  const { repoId, userId } = req.params;
  const ownerId = req.headers['user-id'];

  try {
    // Verificar que quien elimina es el dueño
    const repoCheck = await db.query(
      `SELECT owner_id FROM repositories WHERE id = $1`,
      [repoId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }

    if (repoCheck.rows[0].owner_id !== parseInt(ownerId)) {
      return res.status(403).json({ error: 'Solo el dueño puede eliminar colaboradores' });
    }

    // Obtener información del colaborador antes de eliminar
    const collabInfo = await db.query(
      `SELECT * FROM collaborators WHERE repository_id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    if (collabInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    await db.query(
      `DELETE FROM collaborators WHERE repository_id = $1 AND user_id = $2`,
      [repoId, userId]
    );

    await logActivity({
      userId: ownerId,
      action: 'remove_collaborator',
      actionType: 'delete',
      repositoryId: repoId,
      details: { removedUserId: userId }
    }, req);

    res.json({ success: true, message: 'Colaborador eliminado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VERIFICAR PERMISOS DE UN USUARIO
// GET /api/collaborators/repositories/:repoId/permissions/:userId
// ============================================
router.get('/repositories/:repoId/permissions/:userId', async (req, res) => {
  const { repoId, userId } = req.params;

  try {
    // Verificar si es el dueño
    const repoCheck = await db.query(
      `SELECT owner_id FROM repositories WHERE id = $1`,
      [repoId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }

    if (repoCheck.rows[0].owner_id === parseInt(userId)) {
      return res.json({ 
        role: 'owner', 
        permissions: ['all'],
        isOwner: true 
      });
    }

    // Buscar colaborador
    const collabResult = await db.query(
      `SELECT role, permissions FROM collaborators 
       WHERE repository_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
      [repoId, userId]
    );

    if (collabResult.rows.length === 0) {
      return res.json({ role: null, permissions: [], isOwner: false });
    }

    res.json({ 
      role: collabResult.rows[0].role, 
      permissions: collabResult.rows[0].permissions,
      isOwner: false 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;