import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, updateUserProfile } from "../../firebase";
import { createUser } from "../../firestore";
import { pickAndUploadProfilePicture, takeAndUploadProfilePicture } from "../../profilePictureUpload";

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [profilePicURL, setProfilePicURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = () => {
    Alert.alert(
      "Select Profile Picture",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Choose from Gallery",
          onPress: handlePickPhoto,
        },
        {
          text: "Skip",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handlePickPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      const url = await pickAndUploadProfilePicture(userId);
      if (url) {
        setProfilePicURL(url);
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      Alert.alert("Upload Failed", "Could not upload photo. You can add one later.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      const url = await takeAndUploadProfilePicture(userId);
      if (url) {
        setProfilePicURL(url);
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      Alert.alert("Upload Failed", "Could not upload photo. You can add one later.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCompleteSetup = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name");
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert("Invalid Name", "Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      // Create Firestore user document
      await createUser(userId, name.trim(), profilePicURL);

      // Update Firebase Auth profile
      await updateUserProfile({ displayName: name.trim() });

      // Navigation will be handled by root layout when it detects the new Firestore document
      router.replace("/(app)/home");
    } catch (error) {
      console.error("Setup error:", error);
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.header}>Set Up Your Profile</Text>
          <Text style={styles.subheader}>Let your gym bros know who you are</Text>

          {/* Profile Picture */}
          <View style={styles.photoContainer}>
            {profilePicURL ? (
              <Image source={{ uri: profilePicURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePhotoUpload}
              disabled={uploadingPhoto || loading}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.photoButtonText}>
                  {profilePicURL ? "Change Photo" : "Add Photo (Optional)"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              editable={!loading}
              autoCapitalize="words"
            />
          </View>

          {/* Complete Setup Button */}
          <TouchableOpacity
            style={[styles.completeButton, loading && styles.disabledButton]}
            onPress={handleCompleteSetup}
            disabled={loading || uploadingPhoto}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeButtonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 50,
  },
  photoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 40,
    justifyContent: "center",
  },
  photoButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  completeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
