import { getCloudinary } from '../config/cloudinary.js';

const root = () => (process.env.CLOUDINARY_FOLDER || 'vaultrix').replace(/[^a-zA-Z0-9_-]/g, '') || 'vaultrix';

export const avatarPublicId = (userId) => `${root()}/avatars/${userId}`;
export const loanReceivedPublicId = (orgId, loanId) => `${root()}/loans/${orgId}/${loanId}/received`;
export const loanPaymentPublicId = (orgId, loanId, paymentId) => `${root()}/loans/${orgId}/${loanId}/payments/${paymentId}`;
export const loansPrefix = (orgId) => `${root()}/loans/${orgId}/`;

const sendBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });

export const uploadAvatarImage = async (buffer, userId) => {
  const result = await sendBuffer(buffer, {
    public_id: avatarPublicId(userId),
    resource_type: 'image',
    type: 'upload',
    overwrite: true,
    invalidate: true,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }, { quality: 'auto' }],
  });
  return { publicId: result.public_id, url: result.secure_url, version: result.version };
};

export const uploadPrivateImage = async (buffer, publicId) => {
  const result = await sendBuffer(buffer, {
    public_id: publicId,
    resource_type: 'image',
    type: 'authenticated',
    overwrite: true,
    invalidate: true,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto' }],
  });
  return { publicId: result.public_id, version: result.version };
};

export const privateImageUrls = (proof) => {
  if (!proof || !proof.publicId) return null;
  const cloud = getCloudinary();
  const base = { resource_type: 'image', type: 'authenticated', sign_url: true, secure: true, version: proof.version };
  return {
    thumb: cloud.url(proof.publicId, {
      ...base,
      transformation: [{ width: 320, height: 320, crop: 'fill' }, { quality: 'auto', fetch_format: 'auto' }],
    }),
    full: cloud.url(proof.publicId, {
      ...base,
      transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    }),
  };
};

export const destroyImage = async (publicId, type = 'authenticated') => {
  if (!publicId) return false;
  try {
    await getCloudinary().uploader.destroy(publicId, { resource_type: 'image', type, invalidate: true });
    return true;
  } catch (error) {
    console.error('Could not remove an image:', error.message);
    return false;
  }
};

export const destroyByPrefix = async (prefix) => {
  try {
    await getCloudinary().api.delete_resources_by_prefix(prefix, { resource_type: 'image', type: 'authenticated' });
    return true;
  } catch (error) {
    console.error('Could not remove images:', error.message);
    return false;
  }
};
