/* ============================================================
   FSI CRM - AI ASSISTANT
   File: js/ai-chat.js

   Fitur:
   - Chat Gemini melalui /api/chat
   - Autentikasi menggunakan sesi Supabase
   - Penanganan HTTP 401, 403, 429, dan error server
   - Timeout permintaan
   - Cooldown untuk mencegah spam
   - Riwayat percakapan sementara
   - Tampilan aman dari HTML injection
   - Mencegah widget dibuat dua kali
   ============================================================ */

(() => {
    "use strict";

    // ========================================================
    // KONFIGURASI
    // ========================================================

    const API_URL = "/api/chat";
    const REQUEST_TIMEOUT_MS = 45000;
    const DEFAULT_COOLDOWN_MS = 3000;
    const RATE_LIMIT_COOLDOWN_MS = 10000;
    const MAX_MESSAGE_LENGTH = 4000;
    const MAX_HISTORY = 10;

    // ========================================================
    // ERROR
    // ========================================================

    class ChatError extends Error {
        constructor(message, status = 0) {
            super(message);
            this.name = "ChatError";
            this.status = status;
        }
    }

    function friendlyMessageForStatus(status, serverMessage) {
        const serverText =
            typeof serverMessage === "string"
                ? serverMessage.trim()
                : "";

        switch (status) {
            case 400:
                return serverText ||
                    "Permintaan tidak valid. Periksa pesan kamu.";

            case 401:
                return serverText ||
                    "Sesi login tidak valid atau sudah berakhir. Silakan login kembali.";

            case 403:
                return serverText ||
                    "Akses ditolak server. Periksa izin akses AI dan konfigurasi CORS.";

            case 404:
                return serverText ||
                    "Endpoint AI tidak ditemukan. Periksa deployment Vercel.";

            case 413:
            case 422:
                return serverText ||
                    "Pesan tidak dapat diproses. Coba persingkat pesan.";

            case 429:
                return serverText ||
                    "Batas permintaan tercapai. Tunggu sebentar lalu coba lagi.";

            case 500:
            case 502:
            case 503:
            case 504:
                return serverText ||
                    "Layanan AI sedang bermasalah. Silakan coba lagi nanti.";

            default:
                return serverText ||
                    `Layanan AI gagal (HTTP ${status}).`;
        }
    }

    // ========================================================
    // BANTUAN RESPONS SERVER
    // ========================================================

    async function readResponse(response) {
        const raw = await response.text();

        if (!raw.trim()) {
            return {};
        }

        try {
            return JSON.parse(raw);
        } catch {
            console.error(
                "[FSI AI] Respons server bukan JSON.",
                "HTTP:",
                response.status
            );

            throw new ChatError(
                response.status === 404
                    ? "Endpoint AI tidak ditemukan. Periksa deployment Vercel."
                    : `Respons server tidak valid (HTTP ${response.status}).`,
                response.status
            );
        }
    }

    function getServerError(data) {
        if (!data || typeof data !== "object") {
            return "";
        }

        if (typeof data.error === "string") {
            return data.error;
        }

        if (typeof data.message === "string") {
            return data.message;
        }

        return "";
    }

    function parseRetryAfterMs(response) {
        const value = response.headers.get("Retry-After");

        if (!value) {
            return null;
        }

        const seconds = Number(value);

        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.min(seconds * 1000, 60000);
        }

        return null;
    }

    // ========================================================
    // INISIALISASI WIDGET
    // ========================================================

    function initAIChat() {
        if (
            document.getElementById("fsi-ai-chat-toggle") ||
            document.getElementById("fsi-ai-chat-panel")
        ) {
            return;
        }

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

            <div
                class="ai-chat-messages"
                aria-live="polite"
                aria-relevant="additions text"
            >
                <div class="ai-chat-message bot">
                    Halo! Saya FSI AI Assistant.
                    Saya bisa membantu pertanyaan CRM, lead, dan PLTS.
                </div>
            </div>

            <form class="ai-chat-form">
                <input
                    class="ai-chat-input"
                    type="text"
                    maxlength="${MAX_MESSAGE_LENGTH}"
                    placeholder="Contoh: cek lead terbaru..."
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

        let isBusy = false;
        let lockedUntil = 0;
        let cooldownTimer = null;

        // Riwayat hanya berada di memori selama widget aktif.
        const history = [];

        // ====================================================
        // TAMPILAN
        // ====================================================

        function refreshIcons() {
            if (
                window.lucide &&
                typeof window.lucide.createIcons === "function"
            ) {
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

            // textContent mencegah pesan pengguna dieksekusi sebagai HTML.
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

        function startCooldown(ms) {
            if (!ms) {
                return;
            }

            lockedUntil = Date.now() + ms;
            sendButton.disabled = true;

            clearTimeout(cooldownTimer);

            cooldownTimer = setTimeout(() => {
                lockedUntil = 0;

                if (!isBusy) {
                    sendButton.disabled = false;
                }
            }, ms);
        }

        // ====================================================
        // EVENT WIDGET
        // ====================================================

        toggle.addEventListener("click", () => {
            setChatOpen(!isOpen());
        });

        closeButton.addEventListener("click", () => {
            setChatOpen(false);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && isOpen()) {
                setChatOpen(false);
            }
        });

        // ====================================================
        // KIRIM PESAN
        // ====================================================

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (isBusy || Date.now() < lockedUntil) {
                return;
            }

            const message = input.value.trim();

            if (!message) {
                return;
            }

            if (message.length > MAX_MESSAGE_LENGTH) {
                addMessage(
                    `Pesan terlalu panjang. Maksimal ${MAX_MESSAGE_LENGTH} karakter.`,
                    "error"
                );
                return;
            }

            isBusy = true;

            let cooldownMs = 0;
            let waiting = null;
            let controller = null;
            let timeoutId = null;

            addMessage(message, "user");

            input.value = "";
            input.disabled = true;
            sendButton.disabled = true;

            sendButton.setAttribute("aria-busy", "true");

            waiting = addMessage("Sedang menyiapkan jawaban...");
            waiting.classList.add("loading");

            try {
                // --------------------------------------------
                // 1. Periksa klien Supabase
                // --------------------------------------------

                const supabase = window.supabaseClient;

                if (
                    !supabase ||
                    !supabase.auth ||
                    typeof supabase.auth.getSession !== "function"
                ) {
                    throw new ChatError(
                        "Koneksi Supabase tidak tersedia. Periksa inisialisasi supabaseClient.",
                        0
                    );
                }

                // --------------------------------------------
                // 2. Ambil sesi dan access token
                // --------------------------------------------

                const {
                    data: sessionData,
                    error: sessionError
                } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error(
                        "[FSI AI] Gagal mengambil sesi Supabase:",
                        sessionError.message
                    );

                    throw new ChatError(
                        "Tidak dapat memeriksa sesi login. Silakan login kembali.",
                        401
                    );
                }

                const accessToken =
                    sessionData?.session?.access_token;

                if (!accessToken) {
                    throw new ChatError(
                        "Sesi login tidak ditemukan. Silakan login kembali.",
                        401
                    );
                }

                // --------------------------------------------
                // 3. Siapkan timeout
                // --------------------------------------------

                controller = new AbortController();

                timeoutId = setTimeout(() => {
                    controller.abort();
                }, REQUEST_TIMEOUT_MS);

                // --------------------------------------------
                // 4. Kirim permintaan ke backend
                // --------------------------------------------

                const response = await fetch(API_URL, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },

                    credentials: "same-origin",

                    body: JSON.stringify({
                        message,
                        history: history.slice(-MAX_HISTORY)
                    }),

                    signal: controller.signal
                });

                // --------------------------------------------
                // 5. Baca respons
                // --------------------------------------------

                const data = await readResponse(response);

                if (!response.ok) {
                    const serverMessage = getServerError(data);

                    console.error("[FSI AI] HTTP error:", {
                        status: response.status,
                        error: serverMessage || "(server tidak memberikan pesan error)"
                    });

                    if (response.status === 429) {
                        cooldownMs =
                            parseRetryAfterMs(response) ??
                            RATE_LIMIT_COOLDOWN_MS;
                    } else {
                        cooldownMs = DEFAULT_COOLDOWN_MS;
                    }

                    throw new ChatError(
                        friendlyMessageForStatus(
                            response.status,
                            serverMessage
                        ),
                        response.status
                    );
                }

                // --------------------------------------------
                // 6. Validasi jawaban AI
                // --------------------------------------------

                if (
                    !data ||
                    typeof data.answer !== "string" ||
                    !data.answer.trim()
                ) {
                    throw new ChatError(
                        "Jawaban AI kosong atau format respons salah."
                    );
                }

                waiting.textContent = data.answer;
                waiting.classList.remove("error");

                // --------------------------------------------
                // 7. Simpan riwayat percakapan
                // --------------------------------------------

                history.push(
                    {
                        role: "user",
                        content: message
                    },
                    {
                        role: "assistant",
                        content: data.answer
                    }
                );

                if (history.length > MAX_HISTORY) {
                    history.splice(
                        0,
                        history.length - MAX_HISTORY
                    );
                }

            } catch (error) {
                console.error("[FSI AI] Gagal:", error);

                if (!cooldownMs) {
                    cooldownMs = DEFAULT_COOLDOWN_MS;
                }

                if (waiting) {
                    waiting.classList.add("error");

                    if (error instanceof ChatError) {
                        waiting.textContent = error.message;
                    } else if (error?.name === "AbortError") {
                        waiting.textContent =
                            "Permintaan AI terlalu lama. Periksa koneksi atau coba lagi.";
                    } else if (error instanceof TypeError) {
                        waiting.textContent =
                            "Tidak dapat menghubungi AI. Periksa koneksi, endpoint, atau konfigurasi server.";
                    } else {
                        waiting.textContent =
                            "AI gagal memproses pesan. Silakan coba lagi.";
                    }
                }

                // Kembalikan pesan agar mudah dicoba ulang.
                if (!input.value) {
                    input.value = message;
                }

            } finally {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }

                if (waiting) {
                    waiting.classList.remove("loading");
                }

                isBusy = false;
                input.disabled = false;

                sendButton.removeAttribute("aria-busy");

                if (cooldownMs) {
                    startCooldown(cooldownMs);
                } else {
                    sendButton.disabled = false;
                }

                if (isOpen()) {
                    input.focus();
                }

                scrollToBottom();
            }
        });

        refreshIcons();
    }

    // ========================================================
    // JALANKAN SATU KALI
    // ========================================================

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initAIChat,
            { once: true }
        );
    } else {
        initAIChat();
    }
})();
