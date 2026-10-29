const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export const isAcceptedImage = (file) => Boolean(file) && ACCEPTED.includes(file.type);

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      return null;
    }
  }
  return null;
};

const loadElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    image.src = url;
  });

export async function compressImage(file, { maxSide = 1600, quality = 0.82 } = {}) {
  if (!isAcceptedImage(file)) throw new Error('type');

  const source = (await loadBitmap(file)) || (await loadElement(file));
  const width = source.width;
  const height = source.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));

  if (scale === 1 && file.size <= 600 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (typeof source.close === 'function') source.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
}
