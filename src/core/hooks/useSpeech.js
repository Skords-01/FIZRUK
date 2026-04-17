import { useState, useRef, useCallback } from "react";

export function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggle = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (listening) {
      recRef.current?.abort();
      setListening(false);
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "uk-UA";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) cbRef.current(transcript);
    };
    rec.onerror = (e) => {
      console.warn("Speech error:", e.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }, [listening, supported]);

  return { listening, toggle, supported };
}
