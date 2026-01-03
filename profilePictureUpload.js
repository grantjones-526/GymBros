import * as ImagePicker from 'expo-image-picker';
import { updateUser } from './firestore';

/**
 * Upload image to Cloudinary (React Native compatible)
 * @param {string} uri - Local image URI
 * @param {string} userId - User ID for organizing uploads
 * @returns {Promise<string>} Cloudinary URL
 */
const uploadToCloudinary = async (uri, userId) => {
  try {
    // Create form data
    const formData = new FormData();

    // Extract file extension from uri
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('file', {
      uri,
      type: `image/${fileType}`,
      name: `profile_${userId}_${Date.now()}.${fileType}`,
    });

    formData.append('upload_preset', 'ml_default'); // You can create a custom preset in Cloudinary
    formData.append('folder', `gymbros/profiles/${userId}`);

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload image to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Request camera roll permissions
 * @returns {Promise<boolean>} Permission granted
 */
export const requestMediaLibraryPermissions = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to select a profile picture!');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

/**
 * Request camera permissions
 * @returns {Promise<boolean>} Permission granted
 */
export const requestCameraPermissions = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to take a profile picture!');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

/**
 * Pick image from gallery, upload to Cloudinary, and update Firestore
 * @param {string} userId - User ID
 * @returns {Promise<string>} Cloudinary URL of uploaded image
 */
export const pickAndUploadProfilePicture = async (userId) => {
  try {
    // Step 1: Request permissions
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission denied');
    }

    // Step 2: Pick image using expo-image-picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop for profile pictures
      quality: 0.8, // Compress to reduce file size
    });

    // Check if user cancelled
    if (result.canceled) {
      return null;
    }

    const imageUri = result.assets[0].uri;

    // Step 3: Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(imageUri, userId);

    // Step 4: Store URL in Firestore user document
    await updateUser(userId, {
      profilePicURL: cloudinaryUrl
    });

    return cloudinaryUrl;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw error;
  }
};

/**
 * Take photo with camera, upload to Cloudinary, and update Firestore
 * @param {string} userId - User ID
 * @returns {Promise<string>} Cloudinary URL of uploaded image
 */
export const takeAndUploadProfilePicture = async (userId) => {
  try {
    // Step 1: Request permissions
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    // Step 2: Take photo using expo-image-picker
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square crop for profile pictures
      quality: 0.8, // Compress to reduce file size
    });

    // Check if user cancelled
    if (result.canceled) {
      return null;
    }

    const imageUri = result.assets[0].uri;

    // Step 3: Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(imageUri, userId);

    // Step 4: Store URL in Firestore user document
    await updateUser(userId, {
      profilePicURL: cloudinaryUrl
    });

    return cloudinaryUrl;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw error;
  }
};

/**
 * Show options to pick from gallery or take photo
 * @param {string} userId - User ID
 * @returns {Promise<string>} Cloudinary URL of uploaded image
 */
export const selectProfilePictureSource = async (userId) => {
  // This should be called with a UI component that lets user choose
  // between gallery or camera. For now, defaults to gallery.
  return await pickAndUploadProfilePicture(userId);
};
