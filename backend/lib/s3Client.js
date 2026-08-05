const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'eduflowadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'eduflow_minio_sec_87236182b8',
  },
  forcePathStyle: true, // Crucial for MinIO S3 compatibility
});

module.exports = s3Client;
