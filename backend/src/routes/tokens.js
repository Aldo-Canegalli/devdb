const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();

// Obtener tokens: GET /api/repositories/:repoId/tokens
router.get('/repositories/:repoId/tokens', async (req, res) => {
  const { repoId } = req.params;
  const userId = req.headers['user-id'];
  
  try {
    const result = await db.query(
      `SELECT * FROM access_tokens WHERE repository_id = $1 AND created_by = $2`,
      [repoId, userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar token: POST /api/repositories/:repoId/tokens
router.post('/repositories/:repoId/tokens', async (req, res) => {
  const { repoId } = req.params;
  const { permissions = ['view'], maxUses = null, expiresInDays = null } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const tokenPlain = `devdb_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');

    const result = await db.query(
      `INSERT INTO access_tokens (repository_id, created_by, token_hash, permissions, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [repoId, userId, tokenHash, permissions, maxUses || null, null]
    );

    await logActivity({
      userId: userId,
      action: 'generate_token',
      actionType: 'create',
      repositoryId: repoId,
      details: { permissions, maxUses, expiresInDays }
    }, req);

    res.json({ success: true, token: tokenPlain });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revocar token: DELETE /api/tokens/:tokenId
router.delete('/tokens/:tokenId', async (req, res) => {
  const { tokenId } = req.params;
  const userId = req.headers['user-id'];

  try {
    const tokenResult = await db.query(
      `SELECT repository_id FROM access_tokens WHERE id = $1`,
      [tokenId]
    );
    
    const repoId = tokenResult.rows[0]?.repository_id;

    await db.query(`UPDATE access_tokens SET is_revoked = TRUE WHERE id = $1`, [tokenId]);

    await logActivity({
      userId: userId,
      action: 'revoke_token',
      actionType: 'update',
      repositoryId: repoId,
      details: { tokenId }
    }, req);

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validar token
router.post('/validate', async (req, res) => {
  const { token } = req.body;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const result = await db.query(
      `SELECT t.*, r.name as repo_name, r.repo_type, u.username as owner_name
       FROM access_tokens t
       JOIN repositories r ON t.repository_id = r.id
       JOIN users u ON r.owner_id = u.id
       WHERE t.token_hash = $1 AND t.is_revoked = FALSE
       AND (t.expires_at IS NULL OR t.expires_at > NOW())
       AND (t.max_uses IS NULL OR t.uses_count < t.max_uses)`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    const tokenData = result.rows[0];

    await db.query(
      `UPDATE access_tokens SET uses_count = uses_count + 1, last_used_at = NOW()
       WHERE id = $1`,
      [tokenData.id]
    );

    res.json({
      success: true,
      repository: {
        id: tokenData.repository_id,
        name: tokenData.repo_name,
        type: tokenData.repo_type,
        owner: tokenData.owner_name
      },
      permissions: tokenData.permissions
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;