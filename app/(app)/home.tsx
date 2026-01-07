import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, logOut } from "../../firebase";
import { subscribeToUserFriends, subscribeToDailyWorkouts, getDailyCaloriesForUsers, getUser, subscribeToPendingFriendRequests } from "../../firestore";
import FriendCard from "../../components/FriendCard";

interface FriendWithWorkout {
  userID: string;
  name: string;
  friendCode: string;
  profilePicURL: string;
  workedOutToday: boolean;
  totalCalories: number;
  muscleGroups: string[];
  lastWorkoutTime: Date | null;
}

export default function Home() {
  const router = useRouter();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [caloriesByUser, setCaloriesByUser] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      const userId = user?.uid;
      if (!userId) return;

      try {
        const userData = await getUser(userId);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    loadCurrentUser();
  }, [user]);

  // Subscribe to friends list
  useEffect(() => {
    const userId = user?.uid;
    if (!userId) {
      router.replace("/(auth)/welcome");
      return;
    }

    const unsubscribeFriends = subscribeToUserFriends(
      userId,
      (friendsData: any[]) => {
        setFriends(friendsData);
        setLoading(false);
      },
      (error: Error) => {
        console.error("Friends error:", error);
        setError("Failed to load friends");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeFriends();
    };
  }, [user]);

  // Subscribe to workouts for all friends
  useEffect(() => {
    if (friends.length === 0) {
      setWorkouts([]);
      return;
    }

    const friendIds = friends.map((f) => f.userID);

    const unsubscribeWorkouts = subscribeToDailyWorkouts(
      friendIds,
      (workoutsData: any[]) => {
        setWorkouts(workoutsData);
      },
      (error: Error) => {
        console.error("Workouts error:", error);
        setError("Failed to load workouts");
      }
    );

    return () => {
      unsubscribeWorkouts();
    };
  }, [friends]);

  // Fetch calories for all friends
  useEffect(() => {
    if (friends.length === 0) {
      setCaloriesByUser({});
      return;
    }

    const fetchCalories = async () => {
      try {
        const friendIds = friends.map((f) => f.userID);
        const calories = await getDailyCaloriesForUsers(friendIds);
        setCaloriesByUser(calories);
      } catch (error) {
        console.error("Calories error:", error);
      }
    };

    fetchCalories();
  }, [friends]);

  // Subscribe to pending friend requests for badge count
  useEffect(() => {
    const userId = user?.uid;
    if (!userId) return;

    const unsubscribe = subscribeToPendingFriendRequests(
      userId,
      (requests) => {
        setPendingRequestsCount(requests.length);
      },
      (error) => {
        console.error("Pending requests error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Aggregate workout data per friend and sort
  const friendsWithWorkouts = useMemo(() => {
    const aggregated: FriendWithWorkout[] = friends.map((friend) => {
      const friendWorkouts = workouts.filter((w) => w.userID === friend.userID);

      if (friendWorkouts.length === 0) {
        return {
          userID: friend.userID,
          name: friend.name,
          friendCode: friend.friendCode,
          profilePicURL: friend.profilePicURL,
          workedOutToday: false,
          totalCalories: caloriesByUser[friend.userID] || 0,
          muscleGroups: [],
          lastWorkoutTime: null,
        };
      }

      // Aggregate muscle groups (calories tracked separately)
      const totalCalories = caloriesByUser[friend.userID] || 0;

      const muscleGroups = [
        ...new Set(
          friendWorkouts
            .map((w) => w.muscleGroup)
            .filter((group) => group && group.trim())
        ),
      ];

      // Get most recent workout for sorting
      const workoutTimes = friendWorkouts
        .map((w) => (w.date?.toDate ? w.date.toDate() : new Date(w.date)))
        .sort((a, b) => b.getTime() - a.getTime());

      const lastWorkoutTime = workoutTimes[0] || null;

      return {
        userID: friend.userID,
        name: friend.name,
        friendCode: friend.friendCode,
        profilePicURL: friend.profilePicURL,
        workedOutToday: true,
        totalCalories,
        muscleGroups,
        lastWorkoutTime,
      };
    });

    // Sort: worked out friends first (by most recent), then inactive alphabetically
    const sorted = aggregated.sort((a, b) => {
      if (a.workedOutToday && !b.workedOutToday) return -1;
      if (!a.workedOutToday && b.workedOutToday) return 1;

      if (a.workedOutToday && b.workedOutToday) {
        // Sort by most recent workout
        if (!a.lastWorkoutTime) return 1;
        if (!b.lastWorkoutTime) return -1;
        return b.lastWorkoutTime.getTime() - a.lastWorkoutTime.getTime();
      }

      // Both didn't work out, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [friends, workouts, caloriesByUser]);

  const handleLogout = async () => {
    try {
      await logOut();
      router.replace("/(auth)/welcome");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Profile Picture - Left */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/(app)/profile")}
        >
          <Image
            source={{ uri: currentUser?.profilePicURL || user?.photoURL || '' }}
            style={styles.headerProfileImage}
          />
        </TouchableOpacity>

        {/* App Title - Center */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>GymBros 💪</Text>
        </View>

        {/* Add Friend Button - Right */}
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => router.push("/(app)/add-friend")}
        >
          <Ionicons name="person-add" size={24} color="#007AFF" />
          {pendingRequestsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && friendsWithWorkouts.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No friends yet!</Text>
          <Text style={styles.emptySubtext}>
            Add friends to see their workout activity
          </Text>
        </View>
      )}

      {/* Friends List */}
      {!loading && !error && friendsWithWorkouts.length > 0 && (
        <FlatList
          data={friendsWithWorkouts}
          keyExtractor={(item) => item.userID}
          renderItem={({ item }) => (
            <FriendCard
              name={item.name}
              friendCode={item.friendCode}
              profilePicURL={item.profilePicURL}
              workedOutToday={item.workedOutToday}
              totalCalories={item.totalCalories}
              muscleGroups={item.muscleGroups}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Logout Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  headerProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  addFriendButton: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
