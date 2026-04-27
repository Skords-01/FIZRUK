import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signIn } from "@/auth/authClient";
import { colors, spacing } from "@/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Не вдалося увійти");
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося увійти");
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
        <Text style={s.title}>З поверненням 👋</Text>
        <Text style={s.subtitle}>Раді бачити тебе знову</Text>

        <Input
          type="email"
          placeholder="ваш@email.com"
          value={email}
          onChangeText={setEmail}
          size="lg"
        />

        <View>
          <View style={s.passHeader}>
            <Text style={s.label}>Пароль</Text>
            <Link href="/(auth)/forgot-password">
              <Text style={s.forgotLink}>Забув пароль?</Text>
            </Link>
          </View>
          <Input
            type="password"
            placeholder="••••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            size="lg"
            suffix={
              <Text onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                {showPass ? "🙈" : "👁️"}
              </Text>
            }
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Button
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!email || !password}
          onPress={onSubmit}
        >
          Увійти
        </Button>

        <View style={s.footer}>
          <Text style={s.footerText}>Ще не маєш акаунта?</Text>
          <Link href="/(auth)/sign-up" style={s.footerLink}>
            <Text style={s.footerLinkText}>Створити</Text>
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
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: { color: colors.textMuted, fontSize: 13 },
  forgotLink: { color: colors.accent, fontSize: 13, fontWeight: "500" },
  eyeBtn: { fontSize: 18, paddingHorizontal: 4 },
  error: { color: colors.danger, fontSize: 13 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { paddingHorizontal: spacing.xs },
  footerLinkText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
});
