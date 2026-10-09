
 // api/chat.js — FSI CRM AI Assistant (Gemini / Vercel Serverless Function)

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY = 10;
const TIMEOUT_MS = 25000;

const SYSTEM_PROMPT =
  "Kamu adalah asisten AI FSI Consultant. " +
  "Jawab dengan sopan, jelas, ringkas, dan profesional, gunakan bahasa yang dipakai pengguna. " +
  "Bantu pekerjaan sales, PLTS, dan penggunaan CRM. " +
  "Kamu belum memiliki akses langsung ke database CRM. " +
  "Jangan mengarang jumlah lead, nama customer, atau data CRM.";

function setCors(res) {
  // CRM dan API berada di domain yang sama.
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
    } catch (error) {
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
  return (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function friendlyError(status, model = MODEL) {
  if (status === 400) {
    return "Permintaan Gemini tidak valid. Periksa format pesan atau model.";
  }

  if (status === 401 || status === 403) {
    return "API key Gemini tidak valid atau tidak memiliki akses.";
  }

  if (status === 404) {
    return `Model "${model}" tidak ditemukan atau tidak tersedia.`;
  }

  if (status === 429) {
    return "Batas penggunaan Gemini tercapai. Tunggu sebentar atau periksa kuota API.";
  }

  if (status >= 500) {
    return "Server Gemini sedang bermasalah. Silakan coba lagi.";
  }

  return "Gemini gagal memproses pesan. Periksa log server Vercel.";
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");

    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      "GEMINI_API_KEY belum tersedia di environment Vercel."
    );

    return res.status(500).json({
      error: "API key Gemini belum dikonfigurasi di server."
    });
  }

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

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

    // Riwayat percakapan sebelumnya.
    const history = cleanHistory(body.history);

    // Format role Gemini: user dan model.
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
      {
        role: "user",
        parts: [{ text: message.trim() }]
      }
    ];

    // Panggil Gemini API.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 2500,
            temperature: 0.7
          }
        }),
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Detail error hanya disimpan di log server.
      console.error("Gemini API error:", {
        status: response.status,
        model: MODEL,
        message: data?.error?.message,
        statusText: data?.error?.status
      });

      return res.status(502).json({
        error: friendlyError(response.status, MODEL)
      });
    }

    const answer = extractAnswer(data);

    if (!answer) {
      console.error("Gemini mengembalikan jawaban kosong:", {
        model: MODEL,
        finishReason: data.candidates?.[0]?.finishReason,
        promptFeedback: data.promptFeedback
      });

      return res.status(502).json({
        error: "Gemini tidak menghasilkan jawaban. Silakan coba lagi."
      });
    }

    return res.status(200).json({
      answer
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(
        "Gemini request timeout setelah",
        TIMEOUT_MS,
        "ms"
      );

      return res.status(504).json({
        error: "AI terlalu lama merespons. Silakan coba lagi."
      });
    }

    console.error("Gemini backend error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan pada server AI."
    });
  } finally {
    clearTimeout(timer);
  }
}
