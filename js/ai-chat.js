/* FSI CRM - AI Assistant */

(() => {
    "use strict";

    const API_URL = "/api/chat";
    const REQUEST_TIMEOUT_MS = 45000;   // batalkan request jika server terlalu lama
    const DEFAULT_COOLDOWN_MS = 3000;   // jeda kirim setelah error
    const RATE_LIMIT_COOLDOWN_MS = 10000;
    const MAX_MESSAGE_LENGTH = 4000;

    // Error yang pesannya aman ditampilkan ke pengguna
    class ChatError extends Error {
        constructor(message, status = 0) {
            super(message);
            this.name = "ChatError";
            this.status = status;
        }
    }

    // Detail teknis hanya masuk console; pengguna melihat pesan yang ramah
    function friendlyMessageForStatus(status, serverMessage) {
        switch (status) {
            case 400:
            case 413:
            case 422:
                return serverMessage || "Pesan tidak dapat diproses. Coba persingkat atau ubah pesan kamu.";
            case 401:
            case 403:
                return "Sesi kamu tidak valid. Muat ulang halaman atau login kembali.";
            case 404:
                return "Endpoint /api/chat tidak ditemukan. Periksa deployment Vercel.";
            case 429:
                return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
            case 500:
            case 502:
            case 503:
            case 504:
                return "Layanan AI sedang tidak tersedia. Silakan coba lagi nanti atau hubungi admin.";
            default:
                return `Layanan AI gagal (HTTP ${status}).`;
        }
    }

    function parseRetryAfterMs(response) {
        const value = response.headers.get("Retry-After");
        if (!value) return null;
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.min(seconds * 1000, 60000);
        }
        return null;
    }

    async function readJson(response) {
        const raw = await response.text();
        if (!raw.trim()) return {};

        try {
            return JSON.parse(raw);
        } catch (parseError) {
            console.error(
                "[FSI AI] Respons bukan JSON:",
                response.status,
                raw.slice(0, 500)
            );
            throw new ChatError(
                response.status === 404
                    ? "Endpoint /api/chat tidak ditemukan. Periksa deployment Vercel."
                    : "Respons server tidak valid. Periksa log Vercel.",
                response.status
            );
        }
    }

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
                <button class="ai-chat-close" type="button"
                    aria-label="Tutup chat">&times;</button>
            </div>

            <div class="ai-chat-messages" aria-live="polite">
                <div class="ai-chat-message bot">
                    Halo! Saya FSI AI Assistant. Ada yang bisa saya bantu?
                </div>
            </div>

            <form class="ai-chat-form">
                <input class="ai-chat-input" type="text"
                    maxlength="${MAX_MESSAGE_LENGTH}"
                    placeholder="Tulis pesan kamu..."
                    autocomplete="off"
                    aria-label="Pesan untuk AI"
                    required>
                <button class="ai-chat-send" type="submit"
                    aria-label="Kirim pesan">➤</button>
            </form>
        `;

        document.body.append(toggle, panel);

        const messages = panel.querySelector(".ai-chat-messages");
        const form = panel.querySelector(".ai-chat-form");
        const input = panel.querySelector(".ai-chat-input");
        const sendButton = panel.querySelector(".ai-chat-send");
        const closeButton = panel.querySelector(".ai-chat-close");

        let isBusy = false;
        let lockedUntil = 0;
        let cooldownTimer = null;

        function refreshIcons() {
            if (window.lucide &&
                typeof window.lucide.createIcons === "function") {
                window.lucide.createIcons();
            }
        }

        function isOpen() {
            return panel.classList.contains("is-open");
        }

        function scrollToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        function addMessage(text, type = "bot") {
            const element = document.createElement("div");
            element.className = `ai-chat-message ${type}`;
            element.textContent = String(text);
            messages.appendChild(element);
            scrollToBottom();
            return element;
        }

        function setChatOpen(open) {
            panel.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute(
                "aria-label",
                open ? "Tutup AI Assistant" : "Buka AI Assistant"
            );

            if (open) {
                input.focus();
            } else {
                toggle.focus();
            }
        }

        // Tahan tombol kirim sementara setelah error agar tidak
        // memperparah rate limit (mis. user menekan Enter berulang kali)
        function startCooldown(ms) {
            if (!ms) return;
            lockedUntil = Date.now() + ms;
            sendButton.disabled = true;

            clearTimeout(cooldownTimer);
            cooldownTimer = setTimeout(() => {
                lockedUntil = 0;
                if (!isBusy) sendButton.disabled = false;
            }, ms);
        }

        toggle.addEventListener("click", () => {
            setChatOpen(!isOpen());
        });

        closeButton.addEventListener("click", () => {
            setChatOpen(false);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && isOpen()) {
                setChatOpen(false);
            }
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (isBusy || Date.now() < lockedUntil) return;

            const message = input.value.trim();
            if (!message) return;

            isBusy = true;
            let cooldownMs = 0;

            addMessage(message, "user");

            input.value = "";
            input.disabled = true;
            sendButton.disabled = true;
            sendButton.setAttribute("aria-busy", "true");

            const waiting = addMessage("Sedang menyiapkan jawaban...");
            waiting.classList.add("loading");

            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                REQUEST_TIMEOUT_MS
            );

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({ message }),
                    signal: controller.signal
                });

                const data = await readJson(response);

                if (!response.ok) {
                    // Detail asli (mis. kuota OpenAI) hanya di console
                    console.error(
                        "[FSI AI] HTTP error:",
                        response.status,
                        data
                    );

                    if (response.status === 429) {
                        cooldownMs =
                            parseRetryAfterMs(response) ??
                            RATE_LIMIT_COOLDOWN_MS;
                    } else {
                        cooldownMs = DEFAULT_COOLDOWN_MS;
                    }

                    throw new ChatError(
                        friendlyMessageForStatus(response.status, data.error),
                        response.status
                    );
                }

                if (typeof data.answer !== "string" || !data.answer.trim()) {
                    throw new ChatError(
                        "Jawaban AI kosong atau format respons salah."
                    );
                }

                waiting.textContent = data.answer;
                waiting.classList.remove("error");

            } catch (error) {
                console.error("[FSI AI] Gagal:", error);

                if (!cooldownMs) cooldownMs = DEFAULT_COOLDOWN_MS;

                waiting.classList.add("error");

                if (error instanceof ChatError) {
                    waiting.textContent = error.message;
                } else if (error && error.name === "AbortError") {
                    waiting.textContent =
                        "AI terlalu lama merespons. Silakan coba lagi.";
                } else if (error instanceof TypeError) {
                    waiting.textContent =
                        "Tidak dapat menghubungi AI. Periksa koneksi dan deployment Vercel.";
                } else {
                    waiting.textContent = "AI gagal memproses pesan.";
                }

                // Kembalikan pesan agar user tidak perlu mengetik ulang
                if (!input.value) input.value = message;

            } finally {
                clearTimeout(timeoutId);
                waiting.classList.remove("loading");

                isBusy = false;
                input.disabled = false;
                sendButton.removeAttribute("aria-busy");

                if (cooldownMs) {
                    startCooldown(cooldownMs);
                } else {
                    sendButton.disabled = false;
                }

                // Jangan "mencuri" fokus kalau panel sudah ditutup
                if (isOpen()) input.focus();
                scrollToBottom();
            }
        });

        refreshIcons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAIChat, {
            once: true
        });
    } else {
        initAIChat();
    }
})();
