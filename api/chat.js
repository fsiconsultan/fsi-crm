// api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OPENAI_API_KEY belum tersedia di environment Vercel.");

    return res.status(500).json({
      error: "API key AI belum dikonfigurasi di server."
    });
  }

  try {
    const { message } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return res.status(400).json({
        error: "Pesan wajib diisi, maksimal 4000 karakter."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "Kamu adalah asisten AI FSI Consultant. " +
            "Jawab dengan sopan, jelas, profesional, dan gunakan bahasa pengguna. " +
            "Kamu belum memiliki akses langsung ke database CRM. " +
            "Jangan mengarang jumlah lead, nama customer, atau data CRM.",
          input: message.trim(),
          max_output_tokens: 1000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Detail hanya muncul di log server Vercel.
      console.error("OpenAI API error:", {
        status: response.status,
        error: data.error
          ? {
              message: data.error.message,
              type: data.error.type,
              code: data.error.code
            }
          : "Unknown API error"
      });

      return res.status(502).json({
        error:
          "AI gagal memproses pesan. Periksa log server Vercel."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!answer) {
      console.error("OpenAI mengembalikan jawaban kosong.");
      return res.status(502).json({
        error: "AI tidak menghasilkan jawaban. Silakan coba lagi."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Chat backend error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan pada server AI."
    });
  }
}
