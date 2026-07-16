const express = require('express');
const db = require('../db');
const router = express.Router();

// ============================================
// BÚSQUEDA AVANZADA DE REPOSITORIOS (VERSIÓN SIMPLIFICADA)
// GET /api/buscar?q=...
// ============================================
router.get('/', async (req, res) => {
  const { 
    q = '', 
    type, 
    user, 
    sort = 'recent', 
    limit = 20,
    offset = 0
  } = req.query;

  try {
    let query = `
      SELECT r.*, 
             u.username as owner_name,
             COALESCE(s.stars_count, 0) as stars_count,
             COALESCE(f.forks_count, 0) as forks_count
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as stars_count 
        FROM stars 
        GROUP BY repository_id
      ) s ON s.repository_id = r.id
      LEFT JOIN (
        SELECT original_repo_id, COUNT(*) as forks_count 
        FROM forks 
        GROUP BY original_repo_id
      ) f ON f.original_repo_id = r.id
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Solo repositorios públicos
    conditions.push(`r.visibility = 'public'`);
    
    // Búsqueda por texto
    if (q && q.trim().length > 0) {
      conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }
    
    // Filtro por tipo
    if (type && ['game', 'code', 'txt', 'mixed'].includes(type)) {
      conditions.push(`r.repo_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    // Filtro por usuario
    if (user && user.trim().length > 0) {
      conditions.push(`u.username ILIKE $${paramIndex}`);
      params.push(`%${user.trim()}%`);
      paramIndex++;
    }
    
    // Agregar condiciones
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Ordenar
    const sortMap = {
      'recent': 'r.created_at DESC',
      'stars': 'stars_count DESC',
      'forks': 'forks_count DESC',
      'name': 'r.name ASC',
      'popular': 'stars_count DESC, forks_count DESC'
    };
    
    const orderClause = sortMap[sort] || 'r.created_at DESC';
    query += ` ORDER BY ${orderClause}`;
    
    // Paginación
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);
    paramIndex++;
    
    query += ` OFFSET $${paramIndex}`;
    params.push(offset);
    
    // Ejecutar consulta
    const result = await db.query(query, params);
    
    // Obtener total
    let countQuery = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM repositories r
      JOIN users u ON r.owner_id = u.id
    `;
    
    const countConditions = [];
    const countParams = [];
    let countIndex = 1;
    
    countConditions.push(`r.visibility = 'public'`);
    
    if (q && q.trim().length > 0) {
      countConditions.push(`(r.name ILIKE $${countIndex} OR r.description ILIKE $${countIndex})`);
      countParams.push(`%${q.trim()}%`);
      countIndex++;
    }
    
    if (type && ['game', 'code', 'txt', 'mixed'].includes(type)) {
      countConditions.push(`r.repo_type = $${countIndex}`);
      countParams.push(type);
      countIndex++;
    }
    
    if (user && user.trim().length > 0) {
      countConditions.push(`u.username ILIKE $${countIndex}`);
      countParams.push(`%${user.trim()}%`);
      countIndex++;
    }
    
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
    
  } catch (error) {
    console.error('Error en búsqueda avanzada:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;