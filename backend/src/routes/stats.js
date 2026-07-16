const express = require('express');
const db = require('../db');
const router = express.Router();

// ============================================
// ESTADÍSTICAS GENERALES DE LA PLATAFORMA
// GET /api/stats/overview
// ============================================
router.get('/overview', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM repositories) as total_repos,
        (SELECT COUNT(*) FROM repositories WHERE visibility = 'public') as public_repos,
        (SELECT COUNT(*) FROM stars) as total_stars,
        (SELECT COUNT(*) FROM forks) as total_forks,
        (SELECT COUNT(*) FROM issues) as total_issues,
        (SELECT COUNT(*) FROM pull_requests) as total_prs,
        (SELECT COUNT(*) FROM pull_requests WHERE status = 'open') as open_prs,
        (SELECT COUNT(*) FROM pull_requests WHERE status = 'merged') as merged_prs,
        (SELECT COUNT(*) FROM access_tokens) as total_tokens,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM notifications WHERE is_read = false) as unread_notifications,
        (SELECT COUNT(*) FROM collaborators) as total_collaborators
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVIDAD POR DÍA (ÚLTIMOS 30 DÍAS)
// GET /api/stats/activity
// ============================================
router.get('/activity', async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action = 'create_repo' THEN 1 END) as new_repos,
        COUNT(CASE WHEN action = 'star_repo' THEN 1 END) as stars,
        COUNT(CASE WHEN action = 'fork_repository' THEN 1 END) as forks,
        COUNT(CASE WHEN action = 'create_issue' THEN 1 END) as issues,
        COUNT(CASE WHEN action = 'upload_file' THEN 1 END) as uploads
      FROM activity_log
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPOSITORIOS MÁS POPULARES
// GET /api/stats/top-repos
// ============================================
router.get('/top-repos', async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        r.id,
        r.name,
        r.repo_type,
        u.username as owner_name,
        COUNT(DISTINCT s.user_id) as stars_count,
        COUNT(DISTINCT f.id) as forks_count,
        COUNT(DISTINCT i.id) as issues_count,
        COUNT(DISTINCT pr.id) as prs_count
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
      LEFT JOIN stars s ON s.repository_id = r.id
      LEFT JOIN forks f ON f.original_repo_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.to_repo_id = r.id
      WHERE r.visibility = 'public'
      GROUP BY r.id, u.username
      ORDER BY stars_count DESC, forks_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USUARIOS MÁS ACTIVOS
// GET /api/stats/top-users
// ============================================
router.get('/top-users', async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT r.id) as repos_created,
        COUNT(DISTINCT s.repository_id) as stars_received,
        COUNT(DISTINCT f.id) as forks_received,
        COUNT(DISTINCT i.id) as issues_created,
        COUNT(DISTINCT pr.id) as prs_created,
        COUNT(DISTINCT a.id) as total_actions
      FROM users u
      LEFT JOIN repositories r ON r.owner_id = u.id AND r.visibility = 'public'
      LEFT JOIN stars s ON s.repository_id = r.id
      LEFT JOIN forks f ON f.original_repo_id = r.id
      LEFT JOIN issues i ON i.created_by = u.id
      LEFT JOIN pull_requests pr ON pr.created_by = u.id
      LEFT JOIN activity_log a ON a.user_id = u.id
      GROUP BY u.id, u.username
      ORDER BY total_actions DESC, repos_created DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVIDAD POR TIPO (Últimos 30 días)
// GET /api/stats/activity-types
// ============================================
router.get('/activity-types', async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM activity_log
      WHERE created_at > NOW() - INTERVAL '${days} days'
        AND action NOT IN ('login', 'register')
      GROUP BY action
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ESTADÍSTICAS DE REPOSITORIOS POR TIPO
// GET /api/stats/repo-types
// ============================================
router.get('/repo-types', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        repo_type,
        COUNT(*) as count
      FROM repositories
      WHERE visibility = 'public'
      GROUP BY repo_type
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ESTADÍSTICAS DE CRECIMIENTO (Usuarios por mes)
// GET /api/stats/growth
// ============================================
router.get('/growth', async (req, res) => {
  const { months = 6 } = req.query;

  try {
    const result = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users
      FROM users
      WHERE created_at > NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;