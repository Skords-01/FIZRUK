import { setCorsHeaders } from "../lib/cors.js";

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";

export default async function handler(req, res) {
  setCorsHeaders(res, req, { allowHeaders: "Content-Type", methods: "POST, OPTIONS" });

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY is not set" });

  try {
    const { audio_base64, mime_type, locale } = req.body || {};
    const b64 = typeof audio_base64 === "string" ? audio_base64.trim() : "";
    const mediaType = typeof mime_type === "string" && mime_type ? mime_type : "audio/webm";
    const lang = String(locale || "uk-UA").toLowerCase().startsWith("uk") ? "uk" : "uk";

    if (!b64) return res.status(400).json({ error: "audio_base64 is required" });
    if (b64.length > 8_000_000) return res.status(413).json({ error: "Audio too large" });

    const ext = guessExt(mediaType);
    const bytes = base64ToUint8Array(b64);
    const file = new File([bytes], `voice.${ext}`, { type: mediaType });

    const form = new FormData();
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", lang);
    form.append("temperature", "0");
    form.append("file", file);

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data?.error?.message || "STT error" });
    }

    const text = String(data?.text || "").trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Помилка STT сервера" });
  }
}

function guessExt(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("mpeg")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("m4a")) return "m4a";
  return "webm";
}

function base64ToUint8Array(base64) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

