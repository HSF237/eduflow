const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../lib/s3Client');

const BUCKET_NAME = process.env.S3_BUCKET || 'eduflow-storage';
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_URL || 'http://localhost:9000/eduflow-storage';

/**
 * Upload a file buffer to MinIO S3 storage
 * @param {Buffer} fileBuffer - Content of file
 * @param {string} objectKey - Storage path (e.g. 'photos/student_123.jpg')
 * @param {string} contentType - MIME type (e.g. 'image/jpeg')
 * @returns {Promise<string>} Public URL of uploaded object
 */
const uploadFile = async (fileBuffer, objectKey, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${PUBLIC_BASE_URL}/${objectKey}`;
};

/**
 * Delete an object from MinIO S3 storage
 */
const deleteFile = async (objectKey) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });

  await s3Client.send(command);
};

module.exports = {
  uploadFile,
  deleteFile,
  BUCKET_NAME,
  PUBLIC_BASE_URL,
};
