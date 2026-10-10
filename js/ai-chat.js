/* ============================================================
   FSI CRM — AI ASSISTANT
   File: js/ai-chat.js

   PREMIUM ENTERPRISE EDITION

   FEATURES:
   - Modern professional AI chat interface
   - CRM and PLTS quick prompts
   - Automatic Indonesian / English-friendly UI
   - Supabase session authentication
   - Existing /api/chat backend compatibility
   - Gemini / GroqCloud / OpenRouter backend compatible
   - CRM fallback handled by backend
   - Safe message rendering
   - Basic Markdown formatting
   - Copy AI response
   - Retry failed requests
   - Typing indicator
   - Request timeout and cooldown
   - Temporary conversation history
   - Responsive and keyboard accessible
   - Prevent duplicate initialization
   - No redundant footer
   ============================================================ */

(() => {
    "use strict";

    // ========================================================
    // 01. CONFIGURATION
    // ========================================================

    const API_URL = "/api/chat";

    const REQUEST_TIMEOUT_MS = 45000;
    const DEFAULT_COOLDOWN_MS = 2000;
    const RATE_LIMIT_COOLDOWN_MS = 10000;

    const MAX_MESSAGE_LENGTH = 4000;
    const MAX_HISTORY = 10;

    const WIDGET_ID = "fsi-ai-chat-toggle";
    const PANEL_ID = "fsi-ai-chat-panel";

    if (window.FSI_AI_CHAT_INITIALIZED) return;

    // Prevent duplicate initialization while DOM is loading.
    window.FSI_AI_CHAT_INITIALIZED = true;

    // ========================================================
    // 02. LANGUAGE
    // ========================================================

    function getLanguage() {
        const language =
            document.documentElement.lang ||
            navigator.language ||
            "id";

        return language.toLowerCase().startsWith("en")
            ? "en"
            : "id";
    }

    function t(id, en) {
        return getLanguage() === "en" ? en : id;
    }

    // The backend remains responsible for interpreting the
    // user's actual message and generating its response.
    // This function only localizes the widget interface.

    // ========================================================
    // 03. ERROR HANDLING
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
            400: t(
                "Permintaan tidak valid. Periksa pesan kamu.",
                "Invalid request. Please check your message."
            ),

            401: t(
                "Sesi login tidak valid atau sudah berakhir. Silakan login kembali.",
                "Your login session is invalid or expired. Please sign in again."
            ),

            403: t(
                "Akses AI ditolak. Periksa izin akun atau konfigurasi server.",
                "AI access was denied. Check your account permissions or server configuration."
            ),

            404: t(
                "Endpoint AI tidak ditemukan. Periksa deployment Vercel.",
                "AI endpoint not found. Check your Vercel deployment."
            ),

            413: t(
                "Pesan terlalu besar. Coba persingkat pesan.",
                "Message is too large. Please shorten it."
            ),

            422: t(
                "Format pesan tidak dapat diproses.",
                "The message format could not be processed."
            ),

            429: t(
                "Batas permintaan tercapai. Tunggu sebentar lalu coba lagi.",
                "The request limit was reached. Please wait a moment and try again."
            ),

            500: t(
                "Server AI mengalami masalah. Silakan coba lagi.",
                "The AI server encountered a problem. Please try again."
            ),

            502: t(
                "Server AI belum merespons dengan benar.",
                "The AI server returned an invalid response."
            ),

            503: t(
                "Layanan AI sedang tidak tersedia.",
                "The AI service is temporarily unavailable."
            ),

            504: t(
                "Server AI membutuhkan waktu terlalu lama.",
                "The AI server took too long to respond."
            )
        };

        return messages[status] ||
            t(
                `Layanan AI gagal merespons (HTTP ${status}).`,
                `The AI service failed to respond (HTTP ${status}).`
            );
    }

    async function readResponse(response) {
        const raw = await response.text();

        if (!raw.trim()) return {};

        try {
            return JSON.parse(raw);
        } catch {
            throw new ChatError(
                response.status === 404
                    ? friendlyMessageForStatus(404)
                    : t(
                        `Respons server tidak valid (HTTP ${response.status}).`,
                        `Invalid server response (HTTP ${response.status}).`
                    ),
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

        if (!value) return null;

        const seconds = Number(value);

        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.min(seconds * 1000, 60000);
        }

        return null;
    }

    // ========================================================
    // 04. ICON HELPERS
    // ========================================================

    function refreshIcons(root = document) {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            try {
                window.lucide.createIcons({
                    attrs: {
                        "stroke-width": 1.8
                    }
                });
            } catch (error) {
                console.warn(
                    "[FSI AI] Icon initialization failed."
                );
            }
        }
    }

    function createIcon(name, className = "") {
        const icon = document.createElement("i");

        icon.setAttribute("data-lucide", name);
        icon.setAttribute("aria-hidden", "true");

        if (className) {
            icon.className = className;
        }

        return icon;
    }

    // ========================================================
    // 05. SAFE MESSAGE RENDERING
    // ========================================================

    /*
     * AI responses are treated as plain text.
     * No response is inserted as raw HTML.
     *
     * Supported formatting:
     * - **bold**
     * - `inline code`
     * - headings beginning with #
     * - bullet lists
     * - numbered lists
     * - fenced code blocks
     * - clickable HTTP/HTTPS URLs
     */

    function appendInlineContent(container, text) {
        const pattern =
            /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<>"']+)/g;

        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                container.appendChild(
                    document.createTextNode(
                        text.slice(lastIndex, match.index)
                    )
                );
            }

            const token = match[0];

            if (
                token.startsWith("**") &&
                token.endsWith("**")
            ) {
                const strong = document.createElement("strong");

                strong.textContent = token.slice(2, -2);

                container.appendChild(strong);
            } else if (
                token.startsWith("`") &&
                token.endsWith("`")
            ) {
                const code = document.createElement("code");

                code.textContent = token.slice(1, -1);

                container.appendChild(code);
            } else {
                const anchor = document.createElement("a");

                anchor.href = token;
                anchor.textContent = token;
                anchor.target = "_blank";
                anchor.rel = "noopener noreferrer";

                container.appendChild(anchor);
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            container.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }
    }

    function renderFormattedText(element, text) {
        element.replaceChildren();

        const lines = String(text).split(/\r?\n/);

        let list = null;
        let listType = "";
        let codeBlock = null;
        let codeLines = [];

        function closeList() {
            list = null;
            listType = "";
        }

        function flushCodeBlock() {
            const pre = document.createElement("pre");
            const code = document.createElement("code");

            code.textContent = codeLines.join("\n");

            pre.appendChild(code);
            element.appendChild(pre);

            codeBlock = null;
            codeLines = [];
        }

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("```")) {
                closeList();

                if (codeBlock) {
                    flushCodeBlock();
                } else {
                    codeBlock = true;
                    codeLines = [];
                }

                continue;
            }

            if (codeBlock) {
                codeLines.push(line);
                continue;
            }

            if (!trimmed) {
                closeList();
                continue;
            }

            const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);

            if (headingMatch) {
                closeList();

                const heading = document.createElement("strong");

                appendInlineContent(heading, headingMatch[1]);

                element.appendChild(heading);
                continue;
            }

            const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);

            const numberMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

            if (bulletMatch || numberMatch) {
                const nextType = bulletMatch ? "ul" : "ol";

                if (listType !== nextType || !list) {
                    closeList();

                    list = document.createElement(nextType);
                    listType = nextType;

                    element.appendChild(list);
                }

                const item = document.createElement("li");

                appendInlineContent(
                    item,
                    (bulletMatch || numberMatch)[1]
                );

                list.appendChild(item);
                continue;
            }

            closeList();

            const paragraph = document.createElement("div");

            appendInlineContent(paragraph, line);

            element.appendChild(paragraph);
        }

        if (codeBlock) {
            flushCodeBlock();
        }
    }

    // ========================================================
    // 06. INITIALIZE WIDGET
    // ========================================================

    function initAIChat() {
        if (
            document.getElementById(WIDGET_ID) ||
            document.getElementById(PANEL_ID)
        ) {
            return;
        }

        // ----------------------------------------------------
        // Floating launcher
        // ----------------------------------------------------

        const toggle = document.createElement("button");

        toggle.id = WIDGET_ID;
        toggle.className = "ai-chat-toggle";
        toggle.type = "button";

        toggle.appendChild(createIcon("bot"));

        const toggleLabel = document.createElement("span");

        toggleLabel.textContent = "AI Assistant";

        toggle.appendChild(toggleLabel);

        toggle.setAttribute(
            "aria-label",
            t("Buka AI Assistant", "Open AI Assistant")
        );

        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", PANEL_ID);

        // ----------------------------------------------------
        // Chat panel
        // ----------------------------------------------------

        const panel = document.createElement("section");

        panel.id = PANEL_ID;
        panel.className = "ai-chat-panel";

        panel.setAttribute(
            "aria-label",
            "FSI AI Assistant"
        );

        panel.setAttribute("aria-hidden", "true");

        panel.innerHTML = `
            <header class="ai-chat-header">

                <div class="ai-chat-avatar" aria-hidden="true">
                    <i data-lucide="sparkles"></i>
                </div>

                <div class="ai-chat-heading">
                    <strong>FSI AI Assistant</strong>
                    <span class="ai-chat-subtitle">
                        ${t(
                            "Asisten CRM & PLTS",
                            "CRM & Solar Assistant"
                        )}
                    </span>
                </div>

                <button
                    class="ai-chat-close"
                    type="button"
                    aria-label="${t("Tutup chat", "Close chat")}"
                    title="${t("Tutup chat", "Close chat")}"
                >&times;</button>

            </header>

            <div
                class="ai-chat-messages"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-label="${t(
                    "Riwayat percakapan",
                    "Conversation history"
                )}"
            ></div>

            <form class="ai-chat-form">

                <input
                    class="ai-chat-input"
                    type="text"
                    maxlength="${MAX_MESSAGE_LENGTH}"
                    placeholder="${t(
                        "Tanyakan tentang CRM atau PLTS...",
                        "Ask about CRM or solar energy..."
                    )}"
                    autocomplete="off"
                    aria-label="${t(
                        "Pesan untuk AI",
                        "Message for AI"
                    )}"
                    required
                >

                <button
                    class="ai-chat-send"
                    type="submit"
                    aria-label="${t("Kirim pesan", "Send message")}"
                    title="${t("Kirim pesan", "Send message")}"
                >
                    <i data-lucide="arrow-up" aria-hidden="true"></i>
                </button>

            </form>
        `;

        // No duplicate footer is added.

        document.body.append(toggle, panel);

        // ====================================================
        // 07. ELEMENT REFERENCES
        // ====================================================

        const messages = panel.querySelector(".ai-chat-messages");
        const form = panel.querySelector(".ai-chat-form");
        const input = panel.querySelector(".ai-chat-input");
        const sendButton = panel.querySelector(".ai-chat-send");
        const closeButton = panel.querySelector(".ai-chat-close");

        let isBusy = false;
        let lockedUntil = 0;
        let cooldownTimer = null;
        let activeController = null;

        // Temporary in-memory conversation only.
        // Nothing is saved to localStorage.
        const history = [];

        // ====================================================
        // 08. UI HELPERS
        // ====================================================

        function isOpen() {
            return panel.classList.contains("is-open");
        }

        function scrollToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        function addMessage(text, type = "bot") {
            const element = document.createElement("div");

            element.className = `ai-chat-message ${type}`;

            if (type === "bot") {
                renderFormattedText(element, text);
            } else {
                element.textContent = String(text);
            }

            messages.appendChild(element);

            if (type === "bot") {
                const actions = document.createElement("div");

                actions.className = "ai-chat-message-actions";

                const copyButton = document.createElement("button");

                copyButton.type = "button";
                copyButton.className = "ai-chat-copy";
                copyButton.appendChild(createIcon("copy"));

                copyButton.setAttribute(
                    "aria-label",
                    t("Salin jawaban", "Copy response")
                );

                copyButton.title = t(
                    "Salin jawaban",
                    "Copy response"
                );

                copyButton.addEventListener("click", async () => {
                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(text);
                        } else {
                            const temporary = document.createElement("textarea");

                            temporary.value = text;
                            temporary.style.position = "fixed";
                            temporary.style.opacity = "0";

                            document.body.appendChild(temporary);

                            temporary.select();

                            const copied = document.execCommand("copy");

                            temporary.remove();

                            if (!copied) {
                                throw new Error("Copy failed");
                            }
                        }

                        copyButton.replaceChildren(
                            createIcon("check")
                        );

                        copyButton.title = t(
                            "Berhasil disalin",
                            "Copied"
                        );

                        copyButton.setAttribute(
                            "aria-label",
                            t("Berhasil disalin", "Copied")
                        );

                        refreshIcons(panel);
                    } catch {
                        copyButton.title = t(
                            "Gagal menyalin",
                            "Could not copy"
                        );
                    }
                });

                actions.appendChild(copyButton);
                element.appendChild(actions);
            }

            scrollToBottom();

            refreshIcons(panel);

            return element;
        }

        function createTypingIndicator() {
            const element = document.createElement("div");

            element.className = "ai-chat-message bot is-typing";

            element.setAttribute("role", "status");

            element.setAttribute(
                "aria-label",
                t("AI sedang berpikir", "AI is thinking")
            );

            for (let index = 0; index < 3; index++) {
                element.appendChild(
                    document.createElement("span")
                );
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
                open
                    ? t("Tutup AI Assistant", "Close AI Assistant")
                    : t("Buka AI Assistant", "Open AI Assistant")
            );

            if (open) {
                window.setTimeout(() => {
                    if (isOpen() && !input.disabled) {
                        input.focus();
                    }
                }, 50);
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

        function updateSendButton() {
            sendButton.disabled =
                isBusy ||
                Date.now() < lockedUntil ||
                !input.value.trim();

            sendButton.setAttribute(
                "aria-busy",
                String(isBusy)
            );
        }

        function removeWelcome() {
            const welcome = messages.querySelector(
                ".ai-chat-welcome"
            );

            if (welcome) {
                welcome.remove();
            }
        }

        function showWelcome() {
            if (messages.querySelector(".ai-chat-welcome")) {
                return;
            }

            const welcome = document.createElement("div");

            welcome.className = "ai-chat-welcome";

            const iconBox = document.createElement("div");

            iconBox.className = "ai-chat-welcome-icon";
            iconBox.setAttribute("aria-hidden", "true");
            iconBox.appendChild(createIcon("message-circle"));

            const heading = document.createElement("h3");

            heading.textContent = t(
                "Halo! Ada yang bisa saya bantu?",
                "Hello! How can I help you?"
            );

            const description = document.createElement("p");

            description.textContent = t(
                "Saya siap membantu pekerjaan CRM, tindak lanjut pelanggan, strategi sales, dan perhitungan PLTS.",
                "I can help with CRM, customer follow-ups, sales strategy, and solar energy calculations."
            );

            const suggestions = document.createElement("div");

            suggestions.className = "ai-chat-suggestions";

            const prompts = [
                {
                    icon: "messages-square",
                    id: "Buat pesan follow-up pelanggan",
                    en: "Create a customer follow-up message",
                    promptId:
                        "Bantu saya menyusun pesan follow-up pelanggan PLTS yang sopan dan profesional.",
                    promptEn:
                        "Help me write a polite and professional solar customer follow-up message."
                },
                {
                    icon: "sun",
                    id: "Jelaskan manfaat dan ROI PLTS",
                    en: "Explain solar benefits and ROI",
                    promptId:
                        "Bantu saya menjelaskan manfaat PLTS, penghematan listrik, ROI, dan payback period kepada calon pelanggan.",
                    promptEn:
                        "Help me explain solar benefits, electricity savings, ROI, and payback period to a potential customer."
                },
                {
                    icon: "chart-no-axes-combined",
                    id: "Strategi appointment dan closing",
                    en: "Appointment and closing strategy",
                    promptId:
                        "Bantu saya membuat strategi harian untuk meningkatkan appointment dan closing penjualan PLTS.",
                    promptEn:
                        "Help me create a daily strategy to improve solar appointments and sales closing."
                },
                {
                    icon: "clipboard-list",
                    id: "Buat laporan aktivitas sales",
                    en: "Create a sales activity report",
                    promptId:
                        "Bantu saya membuat laporan aktivitas sales harian yang profesional untuk manager.",
                    promptEn:
                        "Help me prepare a professional daily sales activity report for my manager."
                }
            ];

            for (const item of prompts) {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "ai-chat-suggestion";

                button.dataset.prompt =
                    getLanguage() === "en"
                        ? item.promptEn
                        : item.promptId;

                button.appendChild(createIcon(item.icon));

                const label = document.createElement("span");

                label.textContent =
                    getLanguage() === "en"
                        ? item.en
                        : item.id;

                button.appendChild(label);

                button.appendChild(
                    createIcon("arrow-up-right")
                );

                suggestions.appendChild(button);
            }

            const disclaimer = document.createElement("div");

            disclaimer.className = "ai-chat-disclaimer";

            disclaimer.textContent = t(
                "AI dapat membuat kesalahan. Periksa kembali informasi penting.",
                "AI can make mistakes. Verify important information."
            );

            welcome.append(
                iconBox,
                heading,
                description,
                suggestions,
                disclaimer
            );

            messages.appendChild(welcome);

            refreshIcons(panel);
        }

        // ====================================================
        // 09. OPEN / CLOSE EVENTS
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

        input.addEventListener("input", updateSendButton);

        // ====================================================
        // 10. QUICK PROMPTS
        // ====================================================

        messages.addEventListener("click", event => {
            const button = event.target.closest(
                "button[data-prompt]"
            );

            if (!button || isBusy || Date.now() < lockedUntil) {
                return;
            }

            input.value = button.dataset.prompt || "";

            updateSendButton();

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
        // 11. SEND MESSAGE
        // ====================================================

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (isBusy || Date.now() < lockedUntil) {
                return;
            }

            const message = input.value.trim();

            if (!message) return;

            if (message.length > MAX_MESSAGE_LENGTH) {
                addMessage(
                    t(
                        `Pesan terlalu panjang. Maksimal ${MAX_MESSAGE_LENGTH} karakter.`,
                        `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`
                    ),
                    "error"
                );

                return;
            }

            isBusy = true;

            let cooldownMs = 0;
            let waiting = null;
            let timeoutId = null;

            addMessage(message, "user");

            removeWelcome();

            input.value = "";
            input.disabled = true;

            updateSendButton();

            waiting = createTypingIndicator();

            try {
                // 1. Verify Supabase client.

                const supabase = window.supabaseClient;

                if (
                    !supabase ||
                    !supabase.auth ||
                    typeof supabase.auth.getSession !== "function"
                ) {
                    throw new ChatError(
                        t(
                            "Koneksi Supabase tidak tersedia. Periksa inisialisasi supabaseClient.",
                            "Supabase is unavailable. Check the supabaseClient initialization."
                        )
                    );
                }

                // 2. Retrieve the current authenticated session.

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
                        t(
                            "Tidak dapat memeriksa sesi login. Silakan login kembali.",
                            "Unable to verify your session. Please sign in again."
                        ),
                        401
                    );
                }

                const accessToken =
                    sessionData?.session?.access_token;

                if (!accessToken) {
                    throw new ChatError(
                        t(
                            "Sesi login tidak ditemukan. Silakan login kembali.",
                            "No active login session was found. Please sign in again."
                        ),
                        401
                    );
                }

                // 3. Start the request timeout.

                const controller = new AbortController();

                activeController = controller;

                timeoutId = window.setTimeout(() => {
                    controller.abort();
                }, REQUEST_TIMEOUT_MS);

                // 4. Send the existing backend request.
                // API keys remain on the server.
                // The frontend never calls providers directly.

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

                // 5. Parse the response.

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

                // 6. Validate the expected response format.

                if (
                    !data ||
                    typeof data.answer !== "string" ||
                    !data.answer.trim()
                ) {
                    throw new ChatError(
                        t(
                            "Jawaban AI kosong atau format respons salah.",
                            "The AI response was empty or invalid."
                        )
                    );
                }

                const answer = data.answer.trim();

                // 7. Replace the typing indicator with the answer.

                waiting.className = "ai-chat-message bot";

                waiting.removeAttribute("role");
                waiting.removeAttribute("aria-label");

                renderFormattedText(waiting, answer);

                // Add a copy button to the answer.

                const actions = document.createElement("div");

                actions.className = "ai-chat-message-actions";

                const copyButton = document.createElement("button");

                copyButton.type = "button";
                copyButton.className = "ai-chat-copy";

                copyButton.setAttribute(
                    "aria-label",
                    t("Salin jawaban", "Copy response")
                );

                copyButton.title = t(
                    "Salin jawaban",
                    "Copy response"
                );

                copyButton.appendChild(createIcon("copy"));

                copyButton.addEventListener("click", async () => {
                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(answer);
                        } else {
                            const temporary =
                                document.createElement("textarea");

                            temporary.value = answer;
                            temporary.style.position = "fixed";
                            temporary.style.opacity = "0";

                            document.body.appendChild(temporary);

                            temporary.select();

                            const copied =
                                document.execCommand("copy");

                            temporary.remove();

                            if (!copied) {
                                throw new Error("Copy failed");
                            }
                        }

                        copyButton.replaceChildren(
                            createIcon("check")
                        );

                        copyButton.title = t(
                            "Berhasil disalin",
                            "Copied"
                        );

                        refreshIcons(panel);
                    } catch {
                        copyButton.title = t(
                            "Gagal menyalin",
                            "Could not copy"
                        );
                    }
                });

                actions.appendChild(copyButton);
                waiting.appendChild(actions);

                refreshIcons(panel);

                // 8. Save temporary conversation history.

                history.push(
                    {
                        role: "user",
                        content: message
                    },
                    {
                        role: "assistant",
                        content: answer
                    }
                );

                if (history.length > MAX_HISTORY) {
                    history.splice(
                        0,
                        history.length - MAX_HISTORY
                    );
                }

            } catch (error) {
                console.error("[FSI AI] Request failed:", {
                    name: error?.name || "Error",
                    status: error?.status || 0
                });

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
                        waiting.textContent = t(
                            "Permintaan terlalu lama. Periksa koneksi lalu coba lagi.",
                            "The request timed out. Check your connection and try again."
                        );
                    } else if (error instanceof TypeError) {
                        waiting.textContent = t(
                            "Tidak dapat menghubungi server AI. Periksa koneksi atau konfigurasi server.",
                            "Unable to reach the AI server. Check your connection or server configuration."
                        );
                    } else {
                        waiting.textContent = t(
                            "AI gagal memproses pesan. Silakan coba lagi.",
                            "The AI could not process the message. Please try again."
                        );
                    }

                    // Provide a retry button without duplicating
                    // the original user message in the history.

                    const retryButton = document.createElement("button");

                    retryButton.type = "button";
                    retryButton.className = "ai-chat-retry";

                    retryButton.textContent = t(
                        "Coba lagi",
                        "Try again"
                    );

                    retryButton.addEventListener("click", () => {
                        if (isBusy || Date.now() < lockedUntil) {
                            return;
                        }

                        input.value = message;

                        updateSendButton();

                        if (typeof form.requestSubmit === "function") {
                            form.requestSubmit();
                        }
                    });

                    waiting.appendChild(
                        document.createElement("br")
                    );

                    waiting.appendChild(retryButton);
                }

                // Restore the message so the user can edit it.

                if (!input.value) {
                    input.value = message;
                }

            } finally {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }

                activeController = null;

                isBusy = false;
                input.disabled = false;

                if (cooldownMs) {
                    startCooldown(cooldownMs);
                } else {
                    lockedUntil = 0;
                }

                updateSendButton();

                if (isOpen()) {
                    input.focus();
                }

                scrollToBottom();
            }
        });

        // ====================================================
        // 12. INITIAL WELCOME SCREEN
        // ====================================================

        showWelcome();

        refreshIcons(panel);

        updateSendButton();

        console.info("[FSI AI] Widget initialized.");
    }

    // ========================================================
    // 13. INITIALIZE ONCE
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
