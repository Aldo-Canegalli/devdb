const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./src/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const usersRoutes = require('./src/routes/users');
const repositoriesRoutes = require('./src/routes/repositories');
const filesRoutes = require('./src/routes/files');
const tokensRoutes = require('./src/routes/tokens');
const activityRoutes = require('./src/routes/activity');
const collaboratorsRoutes = require('./src/routes/collaborators');
const statsRoutes = require('./src/routes/stats');
const followsRoutes = require('./src/routes/follows');
const tagsRoutes = require('./src/routes/tags');
const forumRoutes = require('./src/routes/forum');
const communityRoutes = require('./src/routes/community');
const pullRequestsRoutes = require('./src/routes/pullRequests');
const conversationsRoutes = require('./src/routes/conversations');
const messagesRoutes = require('./src/routes/messages');
const notificationsRoutes = require('./src/routes/notifications');
const issuesRoutes = require('./src/routes/issues');
const forksRoutes = require('./src/routes/forks');

// Registrar rutas
app.use('/api/users', usersRoutes);
app.use('/api/repositories', repositoriesRoutes);
app.use('/api', filesRoutes);
app.use('/api', tokensRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/collaborators', collaboratorsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/pull-requests', pullRequestsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/forks', forksRoutes);


// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: '🚀 DevDB Backend funcionando' });
});

// Ruta de test para DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Ruta de prueba simple (última opción)
app.get('/test', (req, res) => {
  res.send('DevDB backend is alive!');
});

// Manejo de errores
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor DevDB corriendo en http://localhost:${PORT}`);
  console.log(`📁 API Files: http://localhost:${PORT}/api/files`);
  console.log(`🔑 API Tokens: http://localhost:${PORT}/api/tokens`);
});