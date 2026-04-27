import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signUp } from "@/auth/authClient";
import { colors, spacing } from "@/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const level = len < 6 ? 0 : len < 10 ? 1 : 2;
  const labels = ["Слабкий", "Середній", "Надійний"];
  const levelColors = [colors.danger, "#f59e0b", "#84cc16"];
  const widths = ["33%", "66%", "100%"] as const;

  return (
    <View style={{ marginTop: 6 }}>
      <View
        style={{
          height: 4,
          backgroundColor: colors.surface,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: widths[level],
            backgroundColor: levelColors[level],
            borderRadius: 4,
          }}
        />
      </View>
      <Text style={{ color: levelColors[level], fontSize: 11, marginTop: 4, fontWeight: "600" }}>
        {labels[level]}
      </Text>
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await signUp.email({ email, password, name });
      if (res.error) {
        setError(res.error.message ?? "Не вдалося створити акаунт");
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося створити акаунт");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.form}
      >
        <Text style={s.title}>Створити акаунт</Text>
        <Text style={s.subtitle}>Безкоштовно. Без зайвого.</Text>

        <Input
          placeholder="Твоє ім'я"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          textContentType="name"
          size="lg"
        />
        <Input
          type="email"
          placeholder="ваш@email.com"
          value={email}
          onChangeText={setEmail}
          size="lg"
        />

        <View>
          <Input
            type="password"
            placeholder="Придумай надійний пароль"
            value={password}
            onChangeText={setPassword}
            size="lg"
          />
          <PasswordStrength password={password} />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Button
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!name || !email || password.length < 10}
          onPress={onSubmit}
        >
          Зареєструватися
        </Button>

        <View style={s.footer}>
          <Text style={s.footerText}>Вже є акаунт?</Text>
          <Link href="/(auth)/sign-in" style={s.footerLink}>
            <Text style={s.footerLinkText}>Увійти</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: 13 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: 6,
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { paddingHorizontal: 4 },
  footerLinkText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
});
