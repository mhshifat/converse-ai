import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import type { IUploadService, UploadResult } from './upload-service';

/**
 * Cloudinary implementation of IUploadService.
 * Env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
export class CloudinaryUploadService implements IUploadService {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async upload(
    buffer: Buffer,
    filename: string,
    options?: { folder?: string }
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const folder = options?.folder ?? 'converseai-logos';
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        },
        (err: Error | undefined, result: { secure_url?: string; public_id?: string } | undefined) => {
          if (err) {
            reject(err);
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Cloudinary did not return a URL'));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      const readable = Readable.from(buffer);
      readable.pipe(stream);
    });
  }
}
