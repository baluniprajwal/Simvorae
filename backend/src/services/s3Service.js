import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'node:crypto';
import { createHttpError } from '../utils/createHttpError.js';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSizeBytes = 5 * 1024 * 1024;

let s3Client;

function getS3Client() {
  if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
    throw createHttpError(500, 'AWS S3 is not configured.');
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

function getFileExtension(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export function validateImageUploadRequest({ contentType, size }) {
  if (!allowedImageTypes.has(contentType)) {
    throw createHttpError(400, 'Only JPEG, PNG, and WebP images are allowed.');
  }

  if (!Number.isFinite(size) || size <= 0 || size > maxImageSizeBytes) {
    throw createHttpError(400, 'Image size must be between 1 byte and 5 MB.');
  }
}

export async function createProductImageUpload({ contentType, size }) {
  validateImageUploadRequest({ contentType, size });

  const extension = getFileExtension(contentType);
  const key = `products/${Date.now()}-${randomUUID()}.${extension}`;

  const upload = await createPresignedPost(getS3Client(), {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Fields: {
      'Content-Type': contentType,
    },
    Conditions: [
      ['content-length-range', 1, maxImageSizeBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Expires: 300,
  });

  return {
    key,
    uploadUrl: upload.url,
    fields: upload.fields,
  };
}

export async function getImageObject(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getS3Client().send(command);
}

export async function deleteImageObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getS3Client().send(command);
}
