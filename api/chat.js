
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY belum dikonfigurasi."
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
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "Kamu adalah asisten AI CRM FSI Consultant. " +
            "Bantu pengguna dengan sopan, jelas, dan profesional. " +
            "Gunakan bahasa yang sesuai dengan bahasa pengguna. " +
            "Jangan mengaku memiliki akses ke database CRM.",
          input: message.trim(),
          max_output_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", response.status);

      return res.status(502).json({
        error: "Layanan AI gagal memproses pesan."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return res.status(200).json({
      answer: answer || "AI belum memberikan jawaban."
    });
  } catch (error) {
    console.error("Chat backend error:", error);

    return res.status(500).json({
      error: "Terjadi kesalahan pada server AI."
    });
  }
}
