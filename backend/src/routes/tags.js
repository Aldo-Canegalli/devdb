const express = require('express');
const db = require('../db');
const router = express.Router();

// ============================================
// NORMALIZAR NOMBRE DE ETIQUETA
// ============================================
function normalizeTagName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ============================================
// OBTENER TODAS LAS ETIQUETAS
// GET /api/tags
// ============================================
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM tags ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BUSCAR ETIQUETAS (auto-completado)
// GET /api/tags/search?q=java
// ============================================
router.get('/search', async (req, res) => {
  const { q = '' } = req.query;
  const limit = 10;

  try {
    let query = `SELECT * FROM tags WHERE 1=1`;
    const params = [];
    
    if (q && q.trim().length > 0) {
      query += ` AND name ILIKE $1`;
      params.push(`%${q.trim()}%`);
    }
    
    query += ` ORDER BY name ASC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER O CREAR ETIQUETA (normalizada)
// POST /api/tags/find-or-create
// ============================================
router.post('/find-or-create', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre de la etiqueta es requerido' });
  }

  const normalizedName = normalizeTagName(name);

  try {
    // Buscar si existe
    let result = await db.query(
      `SELECT * FROM tags WHERE LOWER(name) = LOWER($1)`,
      [normalizedName]
    );

    // Si existe, devolverla
    if (result.rows.length > 0) {
      return res.json({ tag: result.rows[0], created: false });
    }

    // Si no existe, crearla
    result = await db.query(
      `INSERT INTO tags (name) VALUES ($1) RETURNING *`,
      [normalizedName]
    );

    res.json({ tag: result.rows[0], created: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// OBTENER ETIQUETAS DE UN REPOSITORIO
// GET /api/tags/repositories/:repoId
// ============================================
router.get('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;

  try {
    const result = await db.query(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN repository_tags rt ON rt.tag_id = t.id
       WHERE rt.repository_id = $1
       ORDER BY t.name ASC`,
      [repoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASIGNAR ETIQUETAS A UN REPOSITORIO
// PUT /api/tags/repositories/:repoId
// Body: { tags: ["javascript", "react"] }
// ============================================
router.put('/repositories/:repoId', async (req, res) => {
  const { repoId } = req.params;
  const { tags } = req.body;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (!tags || !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Se requiere un array de etiquetas' });
  }

  try {
    // Verificar que el usuario es dueño del repositorio
    const repoCheck = await db.query(
      `SELECT owner_id FROM repositories WHERE id = $1`,
      [repoId]
    );

    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repositorio no encontrado' });
    }

    if (repoCheck.rows[0].owner_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este repositorio' });
    }

    // Eliminar etiquetas existentes
    await db.query(`DELETE FROM repository_tags WHERE repository_id = $1`, [repoId]);

    // Agregar nuevas etiquetas
    for (const tagName of tags) {
      if (!tagName || tagName.trim().length === 0) continue;

      const normalizedName = tagName.trim().toLowerCase();

      // Buscar o crear la etiqueta
      let tagResult = await db.query(
        `SELECT id FROM tags WHERE LOWER(name) = LOWER($1)`,
        [normalizedName]
      );

      let tagId;
      if (tagResult.rows.length === 0) {
        // Crear nueva etiqueta
        const newTag = await db.query(
          `INSERT INTO tags (name) VALUES ($1) RETURNING id`,
          [normalizedName]
        );
        tagId = newTag.rows[0].id;
      } else {
        tagId = tagResult.rows[0].id;
      }

      // Asignar etiqueta al repositorio
      await db.query(
        `INSERT INTO repository_tags (repository_id, tag_id) VALUES ($1, $2)
         ON CONFLICT (repository_id, tag_id) DO NOTHING`,
        [repoId, tagId]
      );
    }

    // Obtener las etiquetas actualizadas
    const updatedTags = await db.query(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN repository_tags rt ON rt.tag_id = t.id
       WHERE rt.repository_id = $1
       ORDER BY t.name ASC`,
      [repoId]
    );

    res.json({
      success: true,
      tags: updatedTags.rows,
      message: 'Etiquetas actualizadas correctamente'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ELIMINAR UNA ETIQUETA (solo si no está en uso)
// DELETE /api/tags/:tagId
// ============================================
router.delete('/:tagId', async (req, res) => {
  const { tagId } = req.params;
  const userId = req.headers['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    // Verificar que la etiqueta no está en uso
    const usageCheck = await db.query(
      `SELECT COUNT(*) FROM repository_tags WHERE tag_id = $1`,
      [tagId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la etiqueta porque está en uso por uno o más repositorios' 
      });
    }

    await db.query(`DELETE FROM tags WHERE id = $1`, [tagId]);
    res.json({ success: true, message: 'Etiqueta eliminada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;