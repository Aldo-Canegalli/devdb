const { S3Client } = require('@aws-sdk/client-s3');

const minioClient = new S3Client({
  endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'devdb_admin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'devdb_admin123',
  },
  forcePathStyle: true,
});

module.exports = minioClient;