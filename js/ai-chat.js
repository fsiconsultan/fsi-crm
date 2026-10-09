/* FSI CRM - AI Assistant */

(() => {
"use strict";

```
function initAIChat() {
    // Hindari widget dibuat dua kali
    if (document.getElementById("fsi-ai-chat-toggle")) return;

    const toggle = document.createElement("button");
    toggle.id = "fsi-ai-chat-toggle";
    toggle.className = "ai-chat-toggle";
    toggle.type = "button";
    toggle.innerHTML = `
        <i data-lucide="bot" aria-hidden="true"></i>
        <span>AI Assistant</span>
    `;
    toggle.setAttribute("aria-label", "Buka AI Assistant");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "fsi-ai-chat-panel");

    const panel = document.createElement("section");
    panel.className = "ai-chat-panel";
    panel.id = "fsi-ai-chat-panel";
    panel.setAttribute("aria-label", "FSI AI Assistant");

    panel.innerHTML = `
        <div class="ai-chat-header">
            <div class="ai-chat-avatar">✦</div>
            <div class="ai-chat-heading">
                <strong>FSI AI Assistant</strong>
                <span>Asisten CRM kamu</span>
            </div>
            <button
                class="ai-chat-close"
                type="button"
                aria-label="Tutup chat"
            >&times;</button>
        </div>

        <div class="ai-chat-messages" aria-live="polite">
            <div class="ai-chat-message bot">
                Halo! Saya FSI AI Assistant. Ada yang bisa saya bantu?
            </div>
        </div>

        <form class="ai-chat-form">
            <input
                class="ai-chat-input"
                type="text"
                maxlength="4000"
                placeholder="Tulis pesan kamu..."
                autocomplete="off"
                aria-label="Pesan untuk AI"
                required
            >
            <button
                class="ai-chat-send"
                type="submit"
                aria-label="Kirim pesan"
            >➤</button>
        </form>
    `;

    document.body.append(toggle, panel);

    const messages = panel.querySelector(".ai-chat-messages");
    const form = panel.querySelector(".ai-chat-form");
    const input = panel.querySelector(".ai-chat-input");
    const sendButton = panel.querySelector(".ai-chat-send");
    const closeButton = panel.querySelector(".ai-chat-close");

    function refreshIcons() {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    function addMessage(text, type = "bot") {
        const message = document.createElement("div");
        message.className = `ai-chat-message ${type}`;
        message.textContent = String(text);
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    }

    function setChatOpen(open) {
        panel.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));

        if (open) {
            input.focus();
        } else {
            toggle.focus();
        }
    }

    toggle.addEventListener("click", () => {
        setChatOpen(!panel.classList.contains("is-open"));
    });

    closeButton.addEventListener("click", () => {
        setChatOpen(false);
    });

    // Tutup dengan tombol Escape
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            panel.classList.contains("is-open")
        ) {
            setChatOpen(false);
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = input.value.trim();

        if (!message || sendButton.disabled) return;

        addMessage(message, "user");

        input.value = "";
        input.disabled = true;
        sendButton.disabled = true;
        sendButton.setAttribute("aria-busy", "true");

        const waiting = addMessage("Sedang menyiapkan jawaban...");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({ message })
            });

            // Baca sebagai teks terlebih dahulu agar error HTML
            // atau respons kosong tidak menyebabkan JSON parse error.
            const rawResponse = await response.text();

            let data = {};

            if (rawResponse.trim()) {
                try {
                    data = JSON.parse(rawResponse);
                } catch {
                    console.error(
                        "[FSI AI] Server tidak mengembalikan JSON.",
                        "HTTP:",
                        response.status,
                        "Respons:",
                        rawResponse.slice(0, 500)
                    );

                    if (response.status === 404) {
                        throw new Error(
                            "Endpoint /api/chat tidak ditemukan. " +
                            "Periksa apakah file backend sudah dibuat dan di-deploy."
                        );
                    }

                    throw new Error(
                        "Respons server tidak valid. " +
                        "Periksa Console dan log backend."
                    );
                }
            }

            if (!response.ok) {
                console.error(
                    "[FSI AI] HTTP error:",
                    response.status,
                    data
                );

                if (response.status === 404) {
                    throw new Error(
                        "Endpoint /api/chat tidak ditemukan (404)."
                    );
                }

                if (response.status === 405) {
                    throw new Error(
                        "Metode POST tidak didukung oleh endpoint AI (405)."
                    );
                }

                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Akses AI ditolak. Periksa autentikasi dan izin backend."
                    );
                }

                if (response.status === 429) {
                    throw new Error(
                        "Batas permintaan AI tercapai. Coba lagi nanti."
                    );
                }

                throw new Error(
                    data.error ||
                    `Layanan AI gagal (HTTP ${response.status}).`
                );
            }

            if (
                !data ||
                typeof data.answer !== "string" ||
                !data.answer.trim()
            ) {
                console.error(
                    "[FSI AI] Format respons tidak sesuai:",
                    data
                );

                throw new Error(
                    "Server merespons, tetapi jawaban AI kosong atau formatnya salah."
                );
            }

            waiting.textContent = data.answer;
            waiting.classList.remove("error");

        } catch (error) {
            console.error("[FSI AI] Gagal memproses pesan:", error);

            waiting.classList.add("error");

            if (error instanceof TypeError) {
                waiting.textContent =
                    "Tidak dapat menghubungi layanan AI. " +
                    "Periksa koneksi, URL endpoint, dan log deployment.";
            } else {
                waiting.textContent =
                    error.message ||
                    "Layanan AI gagal memproses pesan.";
            }

        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            sendButton.removeAttribute("aria-busy");
            input.focus();
            messages.scrollTop = messages.scrollHeight;
        }
    });

    refreshIcons();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initAIChat,
        { once: true }
    );
} else {
    initAIChat();
}
```

})();
