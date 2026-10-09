// api/chat.js — FSI CRM AI Assistant (Vercel Serverless Function)

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY = 10;
const TIMEOUT_MS = 25000;

const SYSTEM_PROMPT =
  "Kamu adalah asisten AI FSI Consultant. " +
  "Jawab dengan sopan, jelas, ringkas, dan profesional, gunakan bahasa yang dipakai pengguna. " +
  "Kamu belum memiliki akses langsung ke database CRM. " +
  "Jangan mengarang jumlah lead, nama customer, atau data CRM.";

function setCors(res) {
  // Aman dibiarkan walau CRM satu domain dengan API.
  // Kalau CRM di domain lain, ganti "*" dengan domain CRM Anda.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (e) {
      return {};
    }
  }
  return body;
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH)
    }));
}

function extractAnswer(data) {
  // Responses API mengembalikan array "output"; teks ada di item type "message"
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function friendlyError(status) {
  if (status === 401) return "API key OpenAI tidak valid. Periksa OPENAI_API_KEY di Vercel.";
  if (status === 403) return "Akun OpenAI tidak punya akses ke model ini.";
  if (status === 404) return `Model "${MODEL}" tidak ditemukan atau tidak tersedia di akun Anda.`;
  if (status === 429) return "Kuota OpenAI habis atau terlalu banyak request. Periksa billing/limit akun OpenAI.";
  if (status >= 500) return "Server OpenAI sedang bermasalah. Coba lagi sebentar.";
  return "AI gagal memproses pesan. Periksa log server Vercel.";
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OPENAI_API_KEY belum tersedia di environment Vercel.");
    return res.status(500).json({
      error: "API key AI belum dikonfigurasi di server."
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = parseBody(req);
    const message = body.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({
        error: `Pesan wajib diisi, maksimal ${MAX_MESSAGE_LENGTH} karakter.`
      });
    }

    const input = [
      ...cleanHistory(body.history),
      { role: "user", content: message.trim() }
    ];

    const payload = {
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input,
      // Model gpt-5 memakai token untuk "berpikir". Batas 1000 sering habis
      // sebelum jawaban keluar, sehingga hasilnya kosong. Dinaikkan di sini.
      max_output_tokens: 2500
    };

    // Kurangi waktu berpikir agar cepat dan jawaban tidak terpotong.
    if (/^(gpt-5|o\d)/.test(MODEL)) {
      payload.reasoning = { effort: "minimal" };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Detail lengkap hanya di log Vercel, tidak dikirim ke browser.
      console.error("OpenAI API error:", {
        status: response.status,
        model: MODEL,
        message: data?.error?.message,
        type: data?.error?.type,
        code: data?.error?.code
      });

      return res.status(502).json({ error: friendlyError(response.status) });
    }

    const answer = extractAnswer(data);

    if (!answer) {
      console.error("OpenAI jawaban kosong:", {
        status: data.status,
        incomplete: data.incomplete_details,
        model: MODEL
      });

      const reason = data?.incomplete_details?.reason;

      return res.status(502).json({
        error:
          reason === "max_output_tokens"
            ? "Jawaban AI terpotong karena terlalu panjang. Coba pertanyaan yang lebih singkat."
            : "AI tidak menghasilkan jawaban. Silakan coba lagi."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Chat backend timeout setelah", TIMEOUT_MS, "ms");
      return res.status(504).json({
        error: "AI terlalu lama merespons. Silakan coba lagi."
      });
    }

    console.error("Chat backend error:", error.message);
    return res.status(500).json({
      error: "Terjadi kesalahan pada server AI."
    });
  } finally {
    clearTimeout(timer);
  }
}
