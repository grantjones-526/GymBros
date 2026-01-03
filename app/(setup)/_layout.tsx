import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="profile-setup"
        options={{
          title: "Complete Your Profile",
          headerLeft: () => null, // Prevent going back
          gestureEnabled: false, // Disable swipe back on iOS
        }}
      />
    </Stack>
  );
}
