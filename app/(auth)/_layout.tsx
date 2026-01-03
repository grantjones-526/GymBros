import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="welcome"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
          headerBackTitle: "Back"
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: "Sign Up",
          headerBackTitle: "Back"
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: "Reset Password",
          headerBackTitle: "Back"
        }}
      />
    </Stack>
  );
}
