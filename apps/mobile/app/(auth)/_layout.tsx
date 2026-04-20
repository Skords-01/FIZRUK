import { Redirect, Stack } from "expo-router";
import { useUser } from "@sergeant/api-client/react";
import { colors } from "@/theme";

export default function AuthLayout() {
  const { data, isLoading } = useUser();

  if (!isLoading && data?.user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: "Вхід" }} />
      <Stack.Screen name="sign-up" options={{ title: "Реєстрація" }} />
    </Stack>
  );
}
