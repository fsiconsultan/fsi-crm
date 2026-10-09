/* FSI CRM - AI Assistant */

(() => {
    function initAIChat() {
        // Hindari widget dibuat dua kali
        if (document.getElementById("fsi-ai-chat-toggle")) return;

        const toggle = document.createElement("button");
        toggle.id = "fsi-ai-chat-toggle";
        toggle.className = "ai-chat-toggle";
        toggle.type = "button";
        toggle.innerHTML = `
            <i data-lucide="bot"></i>
            <span>AI Assistant</span>
        `;
        toggle.setAttribute("aria-label", "Buka AI Assistant");

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
                <button class="ai-chat-close"
                    type="button" aria-label="Tutup chat">&times;</button>
            </div>

            <div class="ai-chat-messages" aria-live="polite">
                <div class="ai-chat-message bot">
                    Halo! Saya FSI AI Assistant. Ada yang bisa saya bantu?
                </div>
            </div>

            <form class="ai-chat-form">
                <input class="ai-chat-input"
                    type="text"
                    maxlength="4000"
                    placeholder="Tulis pesan kamu..."
                    autocomplete="off"
                    aria-label="Pesan untuk AI"
                    required>
                <button class="ai-chat-send"
                    type="submit" aria-label="Kirim pesan">➤</button>
            </form>
        `;

        document.body.append(toggle, panel);

        const messages = panel.querySelector(".ai-chat-messages");
        const form = panel.querySelector(".ai-chat-form");
        const input = panel.querySelector(".ai-chat-input");
        const sendButton = panel.querySelector(".ai-chat-send");
        const closeButton = panel.querySelector(".ai-chat-close");

        function refreshIcons() {
            if (window.lucide) window.lucide.createIcons();
        }

        function addMessage(text, type = "bot") {
            const message = document.createElement("div");
            message.className = `ai-chat-message ${type}`;
            // Gunakan textContent agar jawaban tidak dieksekusi sebagai HTML
            message.textContent = text;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
            return message;
        }

        toggle.addEventListener("click", () => {
            panel.classList.toggle("is-open");
            if (panel.classList.contains("is-open")) input.focus();
        });

        closeButton.addEventListener("click", () => {
            panel.classList.remove("is-open");
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const message = input.value.trim();
            if (!message || sendButton.disabled) return;

            addMessage(message, "user");
            input.value = "";
            input.disabled = true;
            sendButton.disabled = true;

            const waiting = addMessage("Sedang menyiapkan jawaban...");

            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "AI tidak dapat memproses pesan."
                    );
                }

                waiting.textContent =
                    data.answer || "AI belum memberikan jawaban.";
            } catch (error) {
                waiting.classList.add("error");
                waiting.textContent =
                    error.message ||
                    "Gagal menghubungi AI. Silakan coba lagi.";
            } finally {
                input.disabled = false;
                sendButton.disabled = false;
                input.focus();
                messages.scrollTop = messages.scrollHeight;
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
