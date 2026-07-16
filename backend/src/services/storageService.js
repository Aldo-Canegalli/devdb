const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const minioClient = require('../config/minio');
const fs = require('fs');

const BUCKET_NAME = process.env.MINIO_BUCKET || 'devdb-files';

// Subir archivo a MinIO
async function uploadFile(file, repoId, filePath) {
  const key = `repos/${repoId}${filePath}/${file.originalname}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
    Metadata: {
      originalName: file.originalname,
      size: file.size.toString(),
    },
  });
  
  await minioClient.send(command);
  
  // Limpiar archivo temporal
  fs.unlinkSync(file.path);
  
  return key;
}

// Obtener contenido de un archivo
async function getFileContent(repoId, filePath, fileName) {
  const key = `repos/${repoId}${filePath}/${fileName}`;
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await minioClient.send(command);
  const chunks = [];
  
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks).toString('utf-8');
}

// Guardar contenido actualizado
async function saveFileContent(repoId, filePath, fileName, content) {
  const key = `repos/${repoId}${filePath}/${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/plain',
  });
  
  await minioClient.send(command);
  return true;
}

// Eliminar archivo
async function deleteFile(repoId, filePath, fileName) {
  const key = `repos/${repoId}${filePath}/${fileName}`;
  
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await minioClient.send(command);
  return true;
}

module.exports = {
  uploadFile,
  getFileContent,
  saveFileContent,
  deleteFile,
};