import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/theme";

const SLIDES = [
  {
    icon: "💰",
    color: "#7c6af7",
    title: "Фінанси під контролем",
    desc: "Відстежуй витрати, будуй бюджети та розумій, куди йдуть гроші — все в одному місці.",
  },
  {
    icon: "🏋️",
    color: "#0d9488",
    title: "Тренування без зупинок",
    desc: "Програми, логи тренувань та прогрес — для тих, хто хоче результату.",
  },
  {
    icon: "🥗",
    color: "#84cc16",
    title: "Харчування по-людськи",
    desc: "Логуй їжу, відстежуй КБЖУ та будуй здорові звички без зайвого стресу.",
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) router.replace("/(auth)/sign-up");
    else setStep((s) => s + 1);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <Pressable style={s.skip} onPress={() => router.replace("/(auth)/sign-up")}>
        <Text style={s.skipText}>Пропустити</Text>
      </Pressable>

      <View style={s.center}>
        <View
          style={[
            s.iconWrap,
            { backgroundColor: slide.color + "22", borderColor: slide.color + "44" },
          ]}
        >
          <Text style={s.icon}>{slide.icon}</Text>
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.desc}>{slide.desc}</Text>
      </View>

      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => setStep(i)}>
            <View
              style={[
                s.dot,
                {
                  width: i === step ? 24 : 8,
                  backgroundColor: i === step ? slide.color : colors.textMuted,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={s.actions}>
        <Pressable style={[s.nextBtn, { backgroundColor: slide.color }]} onPress={goNext}>
          <Text style={s.nextBtnText}>{isLast ? "Розпочати →" : "Далі"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  skip: { alignSelf: "flex-end", paddingTop: spacing.md, paddingBottom: spacing.lg },
  skipText: { color: colors.textMuted, fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 52 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center" },
  desc: { color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingBottom: spacing.xl },
  nextBtn: { borderRadius: radius.md, paddingVertical: 16, alignItems: "center" },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
