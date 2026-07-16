const express = require('express');
const db = require('../db');
const router = express.Router();

// ============================================
// OBTENER FEED GLOBAL DE ACTIVIDAD
// GET /api/community/feed
// ============================================
router.get('/feed', async (req, res) => {
  const { limit = 30, type } = req.query;

  try {
    let query = `
      SELECT 
        a.id,
        a.user_id,
        a.action,
        a.action_type,
        a.details,
        a.created_at,
        u.username as user_name,
        u.avatar_url,
        r.id as repository_id,
        r.name as repository_name,
        r.repo_type,
        f.file_name,
        i.id as issue_id,
        i.title as issue_title
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN repositories r ON a.repository_id = r.id
      LEFT JOIN files f ON a.file_id = f.id
      LEFT JOIN issues i ON a.issue_id = i.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtrar por tipo de acción
    if (type && ['star', 'fork', 'comment', 'issue', 'repo', 'file'].includes(type)) {
      const typeMap = {
        'star': 'star_repo',
        'fork': 'fork_repository',
        'comment': 'comment_issue',
        'issue': 'create_issue',
        'repo': 'create_repo',
        'file': 'upload_file'
      };
      query += ` AND a.action = $${paramIndex}`;
      params.push(typeMap[type]);
      paramIndex++;
    } else {
      // Excluir acciones de login/registro
      query += ` AND a.action NOT IN ('login', 'register')`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER ESTADÍSTICAS DE LA PLATAFORMA
// GET /api/community/stats
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM repositories WHERE visibility = 'public') as total_repos,
        (SELECT COUNT(*) FROM stars) as total_stars,
        (SELECT COUNT(*) FROM forks) as total_forks,
        (SELECT COUNT(*) FROM issues) as total_issues,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM access_tokens) as total_tokens
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER USUARIOS DESTACADOS
// GET /api/community/top-users
// ============================================
router.get('/top-users', async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        COUNT(DISTINCT r.id) as repos_count,
        COUNT(DISTINCT s.repository_id) as stars_received,
        COUNT(DISTINCT f.id) as forks_received,
        COUNT(DISTINCT i.id) as issues_count
      FROM users u
      LEFT JOIN repositories r ON r.owner_id = u.id AND r.visibility = 'public'
      LEFT JOIN stars s ON s.repository_id = r.id
      LEFT JOIN forks f ON f.original_repo_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY u.id, u.username, u.avatar_url, u.bio
      ORDER BY stars_received DESC, repos_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER ACTIVIDAD RECIENTE DE UN USUARIO ESPECÍFICO
// GET /api/community/user/:userId
// ============================================
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        a.*,
        u.username as user_name,
        r.name as repository_name,
        f.file_name,
        i.title as issue_title
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN repositories r ON a.repository_id = r.id
      LEFT JOIN files f ON a.file_id = f.id
      LEFT JOIN issues i ON a.issue_id = i.id
      WHERE a.user_id = $1
        AND a.action NOT IN ('login', 'register')
      ORDER BY a.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;