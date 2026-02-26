import { CloudinaryUploadService } from './cloudinary-upload-service';

/**
 * Abstraction for image/file upload so the implementation can be swapped
 * (e.g. Cloudinary now, S3 or another provider later).
 */

export interface UploadResult {
  url: string;
  /** Optional public_id or key from the provider */
  publicId?: string;
}

export interface IUploadService {
  /**
   * Upload an image and return its public URL.
   * @param buffer - File content
   * @param filename - Original filename (used for extension / content type)
   * @param options - Optional folder or tags for the provider
   */
  upload(
    buffer: Buffer,
    filename: string,
    options?: { folder?: string }
  ): Promise<UploadResult>;
}

let instance: IUploadService | null = null;

/**
 * Get the configured upload service.
 * Set UPLOAD_PROVIDER=cloudinary (default) or another provider key to swap.
 */
export function getUploadService(): IUploadService | null {
  if (instance) return instance;
  const provider = (process.env.UPLOAD_PROVIDER ?? 'cloudinary').toLowerCase();
  if (provider === 'cloudinary') {
    try {
      instance = new CloudinaryUploadService();
    } catch {
      instance = null;
    }
  }
  // Future: else if (provider === 's3') instance = new S3UploadService();
  return instance;
}

/** For tests or to swap implementation at runtime */
export function setUploadService(service: IUploadService | null): void {
  instance = service;
}
