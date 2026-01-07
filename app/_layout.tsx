import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { subscribeToAuthChanges } from "../firebase";
import { getUser } from "../firestore";
import { User } from "firebase/auth";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (user: User | null) => {
      if (user) {
        // User is authenticated, check if they have a Firestore profile
        try {
          await getUser(user.uid);
          // User data exists, will redirect in index.tsx
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
