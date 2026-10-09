/* ============================================================
   FSI CRM — AI ASSISTANT
   File: js/ai-chat.js

   FEATURES:
   - Professional AI chat interface
   - Quick prompts for CRM and PLTS
   - Supabase session authentication
   - Gemini backend via /api/chat
   - Request timeout and cooldown
   - Temporary conversation history
   - Safe text rendering
   - Typing indicator and error handling
   - Responsive CSS compatibility
   - Prevent duplicate initialization
   ============================================================ */

(() => {
    "use strict";

    // ========================================================
    // CONFIGURATION
    // ========================================================

    const API_URL = "/api/chat";
    const REQUEST_TIMEOUT_MS = 45000;
    const DEFAULT_COOLDOWN_MS = 3000;
    const RATE_LIMIT_COOLDOWN_MS = 10000;
    const MAX_MESSAGE_LENGTH = 4000;
    const MAX_HISTORY = 10;

    if (window.FSI_AI_CHAT_INITIALIZED) return;
    window.FSI_AI_CHAT_INITIALIZED = true;

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    class ChatError extends Error {
        constructor(message, status = 0) {
            super(message);
            this.name = "ChatError";
            this.status = status;
        }
    }

    function friendlyMessageForStatus(status) {
        const messages = {
            400: "Permintaan tidak valid. Periksa pesan kamu.",
            401: "Sesi login tidak valid atau sudah berakhir. Silakan login kembali.",
            403: "Akses AI ditolak. Periksa izin akun atau konfigurasi server.",
            404: "Endpoint AI tidak ditemukan. Periksa deployment Vercel.",
            413: "Pesan terlalu besar untuk diproses. Coba persingkat pesan.",
            422: "Format pesan tidak dapat diproses.",
            429: "Batas permintaan AI tercapai. Tunggu sebentar lalu coba lagi.",
            500: "Server AI mengalami masalah. Silakan coba lagi.",
            502: "Server AI belum merespons dengan benar.",
            503: "Layanan AI sedang tidak tersedia.",
            504: "Server AI membutuhkan waktu terlalu lama."
        };

        return messages[status] ||
            `Layanan AI gagal merespons (HTTP ${status}).`;
    }

    async function readResponse(response) {
        const raw = await response.text();

        if (!raw.trim()) return {};

        try {
            return JSON.parse(raw);
        } catch {
            throw new ChatError(
                response.status === 404
                    ? "Endpoint AI tidak ditemukan. Periksa deployment Vercel."
                    : `Respons server tidak valid (HTTP ${response.status}).`,
                response.status
            );
        }
    }

    function getServerError(data) {
        if (!data || typeof data !== "object") return "";

        if (typeof data.error === "string") return data.error;
        if (typeof data.message === "string") return data.message;

        return "";
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

    // ========================================================
    // INITIALIZE WIDGET
    // ========================================================

    function initAIChat() {
        if (
            document.getElementById("fsi-ai-chat-toggle") ||
            document.getElementById("fsi-ai-chat-panel")
        ) {
            return;
        }

        // Floating button
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

        // Chat panel
        const panel = document.createElement("section");

        panel.id = "fsi-ai-chat-panel";
        panel.className = "ai-chat-panel";
        panel.setAttribute("aria-label", "FSI AI Assistant");
        panel.setAttribute("aria-hidden", "true");

        panel.innerHTML = `
            <header class="ai-chat-header">

                <div class="ai-chat-avatar" aria-hidden="true">
                    <i data-lucide="sparkles"></i>
                </div>

                <div class="ai-chat-heading">
                    <strong>FSI AI Assistant</strong>
                    <span>
                        <span class="ai-chat-status-dot"></span>
                        Asisten CRM &amp; PLTS
                    </span>
                </div>

                <button
                    class="ai-chat-close"
                    type="button"
                    aria-label="Tutup chat"
                >&times;</button>

            </header>

            <div
                class="ai-chat-messages"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-label="Riwayat percakapan"
            >

                <div class="ai-chat-welcome">

                    <div class="ai-chat-welcome-icon"
                         aria-hidden="true">
                        <i data-lucide="message-circle"></i>
                    </div>

                    <h3>Halo! Ada yang bisa saya bantu?</h3>

                    <p>
                        Saya FSI AI Assistant. Saya siap membantu
                        pekerjaan CRM, tindak lanjut pelanggan,
                        strategi sales, dan perhitungan PLTS kamu.
                    </p>

                    <div class="ai-chat-suggestions">

                        <button
                            type="button"
                            data-prompt="Bantu saya menyusun pesan follow-up pelanggan PLTS yang sopan dan profesional."
                        >
                            <i data-lucide="messages-square"
                               aria-hidden="true"></i>
                            <span>Buat pesan follow-up pelanggan</span>
                            <i data-lucide="arrow-up-right"
                               aria-hidden="true"></i>
                        </button>

                        <button
                            type="button"
                            data-prompt="Bantu saya menjelaskan manfaat PLTS, penghematan listrik, ROI, dan payback period kepada calon pelanggan."
                        >
                            <i data-lucide="sun"
                               aria-hidden="true"></i>
                            <span>Jelaskan manfaat dan ROI PLTS</span>
                            <i data-lucide="arrow-up-right"
                               aria-hidden="true"></i>
                        </button>

                        <button
                            type="button"
                            data-prompt="Bantu saya membuat strategi harian untuk meningkatkan appointment dan closing penjualan PLTS."
                        >
                            <i data-lucide="chart-no-axes-combined"
                               aria-hidden="true"></i>
                            <span>Strategi appointment dan closing</span>
                            <i data-lucide="arrow-up-right"
                               aria-hidden="true"></i>
                        </button>

                        <button
                            type="button"
                            data-prompt="Bantu saya membuat laporan aktivitas sales harian yang profesional untuk manager."
                        >
                            <i data-lucide="clipboard-list"
                               aria-hidden="true"></i>
                            <span>Buat laporan aktivitas sales</span>
                            <i data-lucide="arrow-up-right"
                               aria-hidden="true"></i>
                        </button>

                    </div>

                    <div class="ai-chat-disclaimer">
                        AI dapat membuat kesalahan. Periksa kembali
                        informasi penting sebelum digunakan.
                    </div>

                </div>

            </div>

            <form class="ai-chat-form">

                <input
                    class="ai-chat-input"
                    type="text"
                    maxlength="${MAX_MESSAGE_LENGTH}"
                    placeholder="Tanyakan sesuatu..."
                    autocomplete="off"
                    aria-label="Pesan untuk AI"
                    required
                >

                <button
                    class="ai-chat-send"
                    type="submit"
                    aria-label="Kirim pesan"
                    title="Kirim pesan"
                >
                    <i data-lucide="arrow-up"
                       aria-hidden="true"></i>
                </button>

            </form>

            <div class="ai-chat-footer">
                FSI CRM · AI Assistant
            </div>
        `;

        document.body.append(toggle, panel);

        // ====================================================
        // ELEMENT REFERENCES
        // ====================================================

        const messages = panel.querySelector(".ai-chat-messages");
        const form = panel.querySelector(".ai-chat-form");
        const input = panel.querySelector(".ai-chat-input");
        const sendButton = panel.querySelector(".ai-chat-send");
        const closeButton = panel.querySelector(".ai-chat-close");
        const suggestions = panel.querySelector(".ai-chat-suggestions");

        let isBusy = false;
        let lockedUntil = 0;
        let cooldownTimer = null;

        // Temporary history, not saved to local storage.
        const history = [];

        // ====================================================
        // UI HELPERS
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
            element.textContent = String(text);

            messages.appendChild(element);
            scrollToBottom();

            return element;
        }

        function createTypingIndicator() {
            const element = document.createElement("div");

            element.className = "ai-chat-message bot is-typing";
            element.setAttribute("role", "status");
            element.setAttribute("aria-label", "AI sedang mengetik");

            for (let i = 0; i < 3; i++) {
                element.appendChild(document.createElement("span"));
            }

            messages.appendChild(element);
            scrollToBottom();

            return element;
        }

        function setChatOpen(open) {
            panel.classList.toggle("is-open", open);
            panel.setAttribute("aria-hidden", String(!open));

            toggle.setAttribute("aria-expanded", String(open));

            toggle.setAttribute(
                "aria-label",
                open ? "Tutup AI Assistant" : "Buka AI Assistant"
            );

            if (open) {
                window.setTimeout(() => input.focus(), 50);
            } else {
                toggle.focus();
            }
        }

        function startCooldown(ms) {
            if (!ms) return;

            lockedUntil = Date.now() + ms;
            sendButton.disabled = true;

            clearTimeout(cooldownTimer);

            cooldownTimer = window.setTimeout(() => {
                lockedUntil = 0;

                if (!isBusy) {
                    sendButton.disabled = false;
                }
            }, ms);
        }

        function hideWelcome() {
            const welcome = messages.querySelector(".ai-chat-welcome");

            if (welcome) welcome.remove();
        }

        // ====================================================
        // OPEN / CLOSE EVENTS
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
        // QUICK PROMPTS
        // ====================================================

        suggestions.addEventListener("click", event => {
            const button = event.target.closest("button[data-prompt]");

            if (!button || isBusy || Date.now() < lockedUntil) {
                return;
            }

            input.value = button.dataset.prompt || "";

            if (typeof form.requestSubmit === "function") {
                form.requestSubmit();
            } else {
                form.dispatchEvent(
                    new Event("submit", {
                        bubbles: true,
                        cancelable: true
                    })
                );
            }
        });

        // ====================================================
        // SEND MESSAGE
        // ====================================================

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (isBusy || Date.now() < lockedUntil) return;

            const message = input.value.trim();

            if (!message) return;

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
            let timeoutId = null;

            addMessage(message, "user");
            hideWelcome();

            input.value = "";
            input.disabled = true;
            sendButton.disabled = true;
            sendButton.setAttribute("aria-busy", "true");

            waiting = createTypingIndicator();

            try {
                // 1. Check Supabase client.
                const supabase = window.supabaseClient;

                if (
                    !supabase ||
                    !supabase.auth ||
                    typeof supabase.auth.getSession !== "function"
                ) {
                    throw new ChatError(
                        "Koneksi Supabase tidak tersedia. Periksa inisialisasi supabaseClient."
                    );
                }

                // 2. Get authenticated session.
                const {
                    data: sessionData,
                    error: sessionError
                } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error(
                        "[FSI AI] Session error:",
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

                // 3. Configure timeout.
                const controller = new AbortController();

                timeoutId = window.setTimeout(() => {
                    controller.abort();
                }, REQUEST_TIMEOUT_MS);

                // 4. Send request to backend.
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

                // 5. Parse server response.
                const data = await readResponse(response);

                if (!response.ok) {
                    const serverMessage = getServerError(data);

                    console.error("[FSI AI] HTTP error:", {
                        status: response.status,
                        error: serverMessage || "No server error message"
                    });

                    if (response.status === 429) {
                        cooldownMs =
                            parseRetryAfterMs(response) ??
                            RATE_LIMIT_COOLDOWN_MS;
                    } else {
                        cooldownMs = DEFAULT_COOLDOWN_MS;
                    }

                    throw new ChatError(
                        friendlyMessageForStatus(response.status),
                        response.status
                    );
                }

                // 6. Validate answer.
                if (
                    !data ||
                    typeof data.answer !== "string" ||
                    !data.answer.trim()
                ) {
                    throw new ChatError(
                        "Jawaban AI kosong atau format respons salah."
                    );
                }

                // Replace typing indicator with the AI answer.
                waiting.className = "ai-chat-message bot";
                waiting.removeAttribute("role");
                waiting.removeAttribute("aria-label");
                waiting.textContent = data.answer;

                // 7. Save temporary conversation history.
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
                console.error("[FSI AI] Request failed:", error);

                if (!cooldownMs) {
                    cooldownMs = DEFAULT_COOLDOWN_MS;
                }

                if (waiting) {
                    waiting.className = "ai-chat-message error";
                    waiting.removeAttribute("role");
                    waiting.removeAttribute("aria-label");

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

                // Restore the failed message for retry.
                if (!input.value) {
                    input.value = message;
                }

            } finally {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }

                isBusy = false;
                input.disabled = false;

                sendButton.removeAttribute("aria-busy");

                if (cooldownMs) {
                    startCooldown(cooldownMs);
                } else {
                    sendButton.disabled = false;
                }

                if (isOpen()) input.focus();

                scrollToBottom();
            }
        });

        refreshIcons();

        console.info("[FSI AI] Widget initialized.");
    }

    // ========================================================
    // RUN ONCE
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
