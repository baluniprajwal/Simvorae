import { createProductImageUpload, getImageObject } from '../services/s3Service.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function createProductImageUploadUrl(req, res, next) {
  try {
    const { contentType, size } = req.body;
    const upload = await createProductImageUpload({
      contentType,
      size: Number(size),
    });

    const publicUrl = `${req.protocol}://${req.get('host')}/api/uploads/images/${upload.key}`;

    return res.status(201).json({
      success: true,
      ...upload,
      url: publicUrl,
    });
  } catch (error) {
    return next(error);
  }
}

export async function streamImage(req, res, next) {
  try {
    const key = req.params[0];

    if (!key || !key.startsWith('products/')) {
      return next(createHttpError(400, 'Invalid image key.'));
    }

    const imageObject = await getImageObject(key);

    res.setHeader('Content-Type', imageObject.ContentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return imageObject.Body.pipe(res);
  } catch (error) {
    return next(createHttpError(404, 'Image not found.'));
  }
}
