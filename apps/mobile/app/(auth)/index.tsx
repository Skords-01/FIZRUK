import { useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/theme";

const modules = [
  { label: "Фінанси", color: "#7c6af7" },
  { label: "Фітнес", color: "#0d9488" },
  { label: "Рутина", color: "#dc5e5e" },
  { label: "Харчування", color: "#84cc16" },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.logoWrap}>
        <View style={s.logo}>
          <Text style={{ fontSize: 32 }}>🏠</Text>
        </View>
        <Text style={s.appName}>Sergeant</Text>
        <Text style={s.tagline}>
          Твій особистий штаб —{"\n"}фінанси, фітнес, харчування, рутина
        </Text>

        <View style={s.chips}>
          {modules.map((m) => (
            <View
              key={m.label}
              style={[
                s.chip,
                { borderColor: m.color + "55", backgroundColor: m.color + "22" },
              ]}
            >
              <Text style={[s.chipText, { color: m.color }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.actions}>
        <Pressable
          style={s.primaryBtn}
          onPress={() => router.push("/(auth)/onboarding")}
        >
          <Text style={s.primaryBtnText}>Почати</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(auth)/sign-in")}>
          <Text style={s.signInLink}>
            Вже маєш акаунт?{" "}
            <Text style={s.signInLinkBold}>Увійти</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  logoWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#7c6af7",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: "600" },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
  primaryBtn: {
    backgroundColor: "#7c6af7",
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  signInLink: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  signInLinkBold: { color: "#7c6af7", fontWeight: "600" },
});
