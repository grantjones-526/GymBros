import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { auth } from "../firebase";
import { getUser } from "../firestore";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthState = async () => {
      const user = auth.currentUser;

      if (!user) {
        // No user logged in, go to welcome screen
        setRedirect("/(auth)/welcome");
      } else {
        // User is logged in, check if they have completed profile setup
        try {
          const userData = await getUser(user.uid);
          if (userData) {
            // Profile complete, go to main app
            setRedirect("/(app)/home");
          } else {
            // Profile not complete, go to setup
            setRedirect("/(setup)/profile-setup");
          }
        } catch (error) {
          console.error("Error checking user data:", error);
          // If error fetching user data, go to profile setup to be safe
          setRedirect("/(setup)/profile-setup");
        }
      }
      setLoading(false);
    };

    checkAuthState();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (redirect) {
    return <Redirect href={redirect} />;
  }

  return null;
}
