import { v2 as cloudinary } from 'cloudinary';

let cloudinaryInitialized = false;

function ensureCloudinaryConfig() {
  if (cloudinaryInitialized) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  cloudinaryInitialized = true;
}

const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'reto7/checkins';

export function isCloudinaryConfigured() {
  ensureCloudinaryConfig();
  return cloudinaryInitialized;
}

export async function uploadCheckInImage(
  fileBuffer: Buffer,
  options: {
    userId: number;
    challengeId: number;
    originalName: string;
    mimeType: string;
  }
) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const dataUri = `data:${options.mimeType};base64,${fileBuffer.toString('base64')}`;

  return cloudinary.uploader.upload(dataUri, {
    folder: uploadFolder,
    resource_type: 'image',
    public_id: `user-${options.userId}-challenge-${options.challengeId}-${Date.now()}`,
    overwrite: false,
    unique_filename: false,
    use_filename: false,
    tags: ['reto7', 'checkin'],
    context: {
      userId: String(options.userId),
      challengeId: String(options.challengeId),
      originalName: options.originalName,
    },
  });
}
