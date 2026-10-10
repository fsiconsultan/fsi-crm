/* ============================================================
   FSI CRM — AI ASSISTANT
   File: js/ai-chat.js

   PREMIUM ENTERPRISE EDITION
   - Sapaan personal sesuai nama user login
   - Quick prompts berbentuk kartu/gelembung yang rapi
   - Layout responsif untuk desktop dan HP
   - Bilingual UI: Indonesia / English
   - Supabase session authentication
   - Existing /api/chat backend compatibility
   - Safe Markdown rendering
   - Copy AI response
   - Retry failed requests
   - Typing indicator
   - Request timeout and cooldown
   - Temporary conversation history
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

    // ========================================================
    // 03. CURRENT USER PROFILE
    // ========================================================

    function getCurrentProfile() {
        const candidates = [
            window.currentProfile,
            window.FSICurrentProfile,
            window.fsiCurrentProfile,
            window.currentUserProfile
        ];

        for (const profile of candidates) {
            if (profile && typeof profile === "object") {
                return profile;
            }
        }

        return null;
    }

    function getUserName() {
        const profile = getCurrentProfile();

        if (!profile) {
            return t("teman", "there");
        }

        const candidates = [
            profile.full_name,
            profile.fullName,
            profile.name,
            profile.display_name,
            profile.displayName,
            profile.username,
            profile.email
        ];

        for (const candidate of candidates) {
            if (typeof candidate !== "string") continue;

            const value = candidate.trim();

            if (!value) continue;

            // Use the email's name portion only as a fallback.
            if (value.includes("@")) {
                const emailName = value.split("@")[0].trim();
                if (emailName) return emailName;
            } else {
                return value;
            }
        }

        return t("teman", "there");
    }

    // ========================================================
    // 04. ERROR HANDLING
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
                "Your session is invalid or expired. Please sign in again."
            ),
            403: t(
                "Akses AI ditolak. Periksa izin akun.",
                "AI access was denied. Check your account permissions."
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
                "The request limit was reached. Please wait and try again."
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

        return messages[status] || t(
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
    // 05. ICON HELPERS
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
            } catch {
                // Icon rendering is optional.
            }
        }
    }

    function createIcon(name, className = "") {
        const icon = document.createElement("i");

        icon.setAttribute("data-lucide", name);
        icon.setAttribute("aria-hidden", "true");

        if (className) icon.className = className;

        return icon;
    }

    // ========================================================
    // 06. SAFE MARKDOWN RENDERING
    // ========================================================

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
                try {
                    const url = new URL(token);

                    if (
                        url.protocol === "https:" ||
                        url.protocol === "http:"
                    ) {
                        const anchor = document.createElement("a");
                        anchor.href = url.href;
                        anchor.textContent = token;
                        anchor.target = "_blank";
                        anchor.rel = "noopener noreferrer";
                        container.appendChild(anchor);
                    } else {
                        container.appendChild(
                            document.createTextNode(token)
                        );
                    }
                } catch {
                    container.appendChild(
                        document.createTextNode(token)
                    );
                }
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
        let codeBlock = false;
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

            codeBlock = false;
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

        if (codeBlock) flushCodeBlock();
    }

    // ========================================================
    // 07. INITIALIZE WIDGET
    // ========================================================

    function initAIChat() {
        if (
            document.getElementById(WIDGET_ID) ||
            document.getElementById(PANEL_ID)
        ) {
            return;
        }

        // Floating launcher
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

        // Chat panel
        const panel = document.createElement("section");

        panel.id = PANEL_ID;
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
                    <span class="ai-chat-subtitle">
                        ${t("Asisten CRM & PLTS", "CRM & Solar Assistant")}
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
                aria-label="${t("Riwayat percakapan", "Conversation history")}"
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
                    aria-label="${t("Pesan untuk AI", "Message for AI")}"
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

        // No extra footer is created.
        document.body.append(toggle, panel);

        // ====================================================
        // 08. ELEMENT REFERENCES
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

        // Temporary conversation history only.
        const history = [];

        // ====================================================
        // 09. UI HELPERS
        // ====================================================

        function isOpen() {
            return panel.classList.contains("is-open");
        }

        function scrollToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        async function copyText(text, button) {
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const temporary = document.createElement("textarea");

                    temporary.value = text;
                    temporary.style.position = "fixed";
                    temporary.style.left = "-9999px";
                    temporary.setAttribute("readonly", "");

                    document.body.appendChild(temporary);
                    temporary.select();

                    const copied = document.execCommand("copy");
                    temporary.remove();

                    if (!copied) {
                        throw new Error("Copy failed");
                    }
                }

                button.replaceChildren(createIcon("check"));

                button.title = t("Berhasil disalin", "Copied");
                button.setAttribute(
                    "aria-label",
                    t("Berhasil disalin", "Copied")
                );

                refreshIcons(panel);
            } catch {
                button.title = t("Gagal menyalin", "Could not copy");
            }
        }

        function addCopyAction(element, text) {
            const actions = document.createElement("div");
            actions.className = "ai-chat-message-actions";

            const copyButton = document.createElement("button");

            copyButton.type = "button";
            copyButton.className = "ai-chat-copy";
            copyButton.appendChild(createIcon("copy"));

            copyButton.title = t("Salin jawaban", "Copy response");
            copyButton.setAttribute(
                "aria-label",
                t("Salin jawaban", "Copy response")
            );

            copyButton.addEventListener("click", () => {
                copyText(text, copyButton);
            });

            actions.appendChild(copyButton);
            element.appendChild(actions);
        }

        function addMessage(text, type = "bot") {
            const element = document.createElement("div");

            element.className = `ai-chat-message ${type}`;

            if (type === "bot") {
                renderFormattedText(element, text);
                addCopyAction(element, text);
            } else {
                element.textContent = String(text);
            }

            messages.appendChild(element);

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
                open
                    ? t("Tutup AI Assistant", "Close AI Assistant")
                    : t("Buka AI Assistant", "Open AI Assistant")
            );

            if (open) {
                window.setTimeout(() => {
                    if (isOpen() && !input.disabled) input.focus();
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
                updateSendButton();
            }, ms);
        }

        function updateSendButton() {
            sendButton.disabled =
                isBusy ||
                Date.now() < lockedUntil ||
                !input.value.trim();

            sendButton.setAttribute("aria-busy", String(isBusy));
        }

        function removeWelcome() {
            messages.querySelector(".ai-chat-welcome")?.remove();
        }

        // ====================================================
        // 10. PERSONALIZED WELCOME + QUICK PROMPT BUBBLES
        // ====================================================

        function showWelcome() {
            if (messages.querySelector(".ai-chat-welcome")) return;

            const welcome = document.createElement("div");
            welcome.className = "ai-chat-welcome";

            const iconBox = document.createElement("div");
            iconBox.className = "ai-chat-welcome-icon";
            iconBox.setAttribute("aria-hidden", "true");
            iconBox.appendChild(createIcon("message-circle"));

            const heading = document.createElement("h3");

            // Name is read from the current CRM profile.
            heading.textContent = t(
                `Halo, ${getUserName()}! 👋`,
                `Hello, ${getUserName()}! 👋`
            );

            const description = document.createElement("p");

            description.textContent = t(
                "Saya siap membantu pekerjaan CRM kamu. Mau mulai dari mana hari ini?",
                "I'm ready to help with your CRM work. What would you like to work on today?"
            );

            const sectionTitle = document.createElement("div");
            sectionTitle.className = "ai-chat-suggestions-title";
            sectionTitle.textContent = t(
                "Pilih bantuan yang kamu butuhkan",
                "Choose how I can help"
            );

            const suggestions = document.createElement("div");
            suggestions.className = "ai-chat-suggestions";

            const prompts = [
                {
                    icon: "messages-square",
                    id: "Buat pesan follow-up pelanggan",
                    en: "Customer follow-up",
                    detailId: "Susun pesan WhatsApp profesional",
                    detailEn: "Write a professional WhatsApp message",
                    promptId:
                        "Bantu saya menyusun pesan follow-up pelanggan PLTS yang sopan dan profesional.",
                    promptEn:
                        "Help me write a polite and professional solar customer follow-up message."
                },
                {
                    icon: "sun",
                    id: "Manfaat & ROI PLTS",
                    en: "Solar benefits & ROI",
                    detailId: "Hitung potensi penghematan",
                    detailEn: "Estimate potential savings",
                    promptId:
                        "Bantu saya menjelaskan manfaat PLTS, penghematan listrik, ROI, dan payback period kepada calon pelanggan.",
                    promptEn:
                        "Help me explain solar benefits, electricity savings, ROI, and payback period to a potential customer."
                },
                {
                    icon: "calendar-check",
                    id: "Appointment & closing",
                    en: "Appointment & closing",
                    detailId: "Rencanakan langkah penjualan",
                    detailEn: "Plan the next sales steps",
                    promptId:
                        "Bantu saya membuat strategi harian untuk meningkatkan appointment dan closing penjualan PLTS.",
                    promptEn:
                        "Help me create a daily strategy to improve solar appointments and sales closing."
                },
                {
                    icon: "chart-no-axes-combined",
                    id: "Laporan aktivitas sales",
                    en: "Sales activity report",
                    detailId: "Ringkas progres harian",
                    detailEn: "Summarize daily progress",
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

                const iconWrap = document.createElement("span");
                iconWrap.className = "ai-chat-suggestion-icon";
                iconWrap.appendChild(createIcon(item.icon));

                const content = document.createElement("span");
                content.className = "ai-chat-suggestion-content";

                const label = document.createElement("strong");
                label.className = "ai-chat-suggestion-label";
                label.textContent =
                    getLanguage() === "en" ? item.en : item.id;

                const detail = document.createElement("small");
                detail.className = "ai-chat-suggestion-detail";
                detail.textContent =
                    getLanguage() === "en"
                        ? item.detailEn
                        : item.detailId;

                content.append(label, detail);

                const arrowWrap = document.createElement("span");
                arrowWrap.className = "ai-chat-suggestion-arrow";
                arrowWrap.appendChild(createIcon("arrow-up-right"));

                button.append(iconWrap, content, arrowWrap);
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
                sectionTitle,
                suggestions,
                disclaimer
            );

            messages.appendChild(welcome);
            refreshIcons(panel);
        }

        // ====================================================
        // 11. OPEN / CLOSE EVENTS
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

        // If the CRM announces profile readiness, refresh the
        // greeting when the welcome screen is still visible.
        document.addEventListener("fsi:profile-ready", () => {
            const welcome = messages.querySelector(".ai-chat-welcome");

            if (welcome) {
                welcome.remove();
                showWelcome();
            }
        });

        // ====================================================
        // 12. QUICK PROMPTS
        // ====================================================

        messages.addEventListener("click", event => {
            const button = event.target.closest("button[data-prompt]");

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
        // 13. SEND MESSAGE
        // ====================================================

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (isBusy || Date.now() < lockedUntil) return;

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

                const {
                    data: sessionData,
                    error: sessionError
                } = await supabase.auth.getSession();

                if (sessionError) {
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

                const controller = new AbortController();
                activeController = controller;

                timeoutId = window.setTimeout(() => {
                    controller.abort();
                }, REQUEST_TIMEOUT_MS);

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

                const data = await readResponse(response);

                if (!response.ok) {
                    const serverMessage = getServerError(data);

                    console.error("[FSI AI] HTTP error:", {
                        status: response.status,
                        error: serverMessage || "No server error message"
                    });

                    cooldownMs = response.status === 429
                        ? (
                            parseRetryAfterMs(response) ??
                            RATE_LIMIT_COOLDOWN_MS
                        )
                        : DEFAULT_COOLDOWN_MS;

                    throw new ChatError(
                        friendlyMessageForStatus(response.status),
                        response.status
                    );
                }

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

                waiting.className = "ai-chat-message bot";
                waiting.removeAttribute("role");
                waiting.removeAttribute("aria-label");

                renderFormattedText(waiting, answer);
                addCopyAction(waiting, answer);

                refreshIcons(panel);

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

                    const retryButton = document.createElement("button");

                    retryButton.type = "button";
                    retryButton.className = "ai-chat-retry";
                    retryButton.textContent = t("Coba lagi", "Try again");

                    retryButton.addEventListener("click", () => {
                        if (isBusy || Date.now() < lockedUntil) return;

                        input.value = message;
                        updateSendButton();

                        if (typeof form.requestSubmit === "function") {
                            form.requestSubmit();
                        }
                    });

                    waiting.appendChild(document.createElement("br"));
                    waiting.appendChild(retryButton);
                }

                if (!input.value) input.value = message;

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

                if (isOpen()) input.focus();

                scrollToBottom();
            }
        });

        // ====================================================
        // 14. INITIAL WELCOME SCREEN
        // ====================================================

        showWelcome();
        refreshIcons(panel);
        updateSendButton();

        console.info("[FSI AI] Widget initialized.");
    }

    // ========================================================
    // 15. INITIALIZE ONCE
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
