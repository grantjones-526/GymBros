import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { pickAndUploadProfilePicture, takeAndUploadProfilePicture } from './profilePictureUpload';
import { auth } from './firebase';

/**
 * Example component showing how to use profile picture upload
 */
const ProfilePictureExample = () => {
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickFromGallery = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert('Error', 'You must be logged in to upload a profile picture');
        return;
      }

      // Pick image from gallery, upload to Cloudinary, and update Firestore
      const url = await pickAndUploadProfilePicture(userId);

      if (url) {
        setProfilePicUrl(url);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert('Error', 'You must be logged in to upload a profile picture');
        return;
      }

      // Take photo with camera, upload to Cloudinary, and update Firestore
      const url = await takeAndUploadProfilePicture(userId);

      if (url) {
        setProfilePicUrl(url);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handlePickFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Display current profile picture */}
      {profilePicUrl ? (
        <Image
          source={{ uri: profilePicUrl }}
          style={styles.profileImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>No Photo</Text>
        </View>
      )}

      {/* Upload button */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showImageSourceOptions}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>
            {profilePicUrl ? 'Change Profile Picture' : 'Upload Profile Picture'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfilePictureExample;
