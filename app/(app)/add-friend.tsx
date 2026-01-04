import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../../firebase";
import { searchUserByNameAndCode, sendFriendRequest } from "../../firestore";

export default function AddFriend() {
  const router = useRouter();
  const user = auth.currentUser;

  const [searchInput, setSearchInput] = useState("");
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      Alert.alert("Input Required", "Please enter a name and friend code");
      return;
    }

    // Parse input (format: Name#1234)
    const parts = searchInput.trim().split("#");
    if (parts.length !== 2) {
      Alert.alert(
        "Invalid Format",
        "Please use format: Name#1234\nExample: John#5678"
      );
      return;
    }

    const [name, code] = parts;
    if (!name.trim() || code.length !== 4 || !/^\d{4}$/.test(code)) {
      Alert.alert(
        "Invalid Format",
        "Please enter a valid name and 4-digit code\nExample: John#5678"
      );
      return;
    }

    setSearching(true);
    try {
      const foundUser = await searchUserByNameAndCode(name.trim(), code);

      if (!foundUser) {
        Alert.alert("User Not Found", "No user found with that name and code");
        setSearchedUser(null);
      } else if (foundUser.userID === user?.uid) {
        Alert.alert("Error", "You cannot add yourself as a friend");
        setSearchedUser(null);
      } else {
        setSearchedUser(foundUser);
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search for user. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchedUser || !user?.uid) return;

    setSendingRequest(true);
    try {
      await sendFriendRequest(user.uid, searchedUser.userID);
      Alert.alert(
        "Request Sent",
        `Friend request sent to ${searchedUser.name}!`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Friend request error:", error);
      const errorMessage = error.message || "Failed to send friend request";
      Alert.alert("Error", errorMessage);
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Add Friend</Text>
        <Text style={styles.subheader}>
          Search by name and friend code
        </Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Friend Name & Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John#5678"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="words"
            editable={!searching && !sendingRequest}
          />
          <Text style={styles.hint}>
            Enter your friend's name followed by their 4-digit code
          </Text>

          <TouchableOpacity
            style={[styles.searchButton, searching && styles.disabledButton]}
            onPress={handleSearch}
            disabled={searching || sendingRequest}
          >
            {searching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Result */}
        {searchedUser && (
          <View style={styles.resultContainer}>
            <Text style={styles.sectionTitle}>Found User</Text>
            <View style={styles.userCard}>
              <Image
                source={{ uri: searchedUser.profilePicURL }}
                style={styles.profileImage}
              />
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{searchedUser.name}</Text>
                  <Text style={styles.friendCode}>#{searchedUser.friendCode}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sendButton, sendingRequest && styles.disabledButton]}
              onPress={handleSendRequest}
              disabled={sendingRequest}
            >
              {sendingRequest ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Friend Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={searching || sendingRequest}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    padding: 20,
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
    marginBottom: 32,
  },
  searchContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  resultContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  friendCode: {
    fontSize: 14,
    color: "#999",
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: "#34C759",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#666",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
