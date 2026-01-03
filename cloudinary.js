import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Helper Functions

/**
 * Upload an image to Cloudinary
 * @param {string} filePath - Local file path or base64 string
 * @param {object} options - Upload options (folder, public_id, etc.)
 * @returns {Promise} Upload result
 */
export const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'gymbros',
      resource_type: 'auto',
      ...options
    });
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image
 * @returns {Promise} Delete result
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get optimized image URL
 * @param {string} publicId - The public ID of the image
 * @param {object} transformations - Transformation options (width, height, crop, etc.)
 * @returns {string} Optimized image URL
 */
export const getImageUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...transformations
  });
};

/**
 * Upload multiple images
 * @param {Array} filePaths - Array of file paths
 * @param {object} options - Upload options
 * @returns {Promise} Array of upload results
 */
export const uploadMultipleImages = async (filePaths, options = {}) => {
  try {
    const uploadPromises = filePaths.map(filePath => uploadImage(filePath, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a thumbnail URL
 * @param {string} publicId - The public ID of the image
 * @param {number} width - Thumbnail width (default: 200)
 * @param {number} height - Thumbnail height (default: 200)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto'
  });
};

export default cloudinary;
