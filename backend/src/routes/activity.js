const express = require('express');
const db = require('../db');
const router = express.Router();

// Obtener actividad de un usuario
router.get('/users/:userId/activity', async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(
      `SELECT a.*, u.username as user_name, r.name as repo_name, f.file_name
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

// Obtener actividad de un repositorio
router.get('/repositories/:repoId/activity', async (req, res) => {
  const { repoId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(
      `SELECT a.*, u.username as user_name, f.file_name
       FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN files f ON a.file_id = f.id
       WHERE a.repository_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [repoId, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener actividad reciente global (para comunidad)
router.get('/recent', async (req, res) => {
  const { limit = 30 } = req.query;

  try {
    const result = await db.query(
      `SELECT a.*, u.username as user_name, r.name as repo_name, f.file_name
       FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN repositories r ON a.repository_id = r.id
       LEFT JOIN files f ON a.file_id = f.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;