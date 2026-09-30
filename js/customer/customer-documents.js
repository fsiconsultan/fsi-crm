/* =========================================================
   FSI CRM — CUSTOMER DOCUMENTS
   PDF Upload / Preview / Download / Delete
========================================================= */

(function () {
    "use strict";

    /* =========================================================
       CONFIG
    ========================================================= */

    const BUCKET_NAME = "customer-documents";
    const TABLE_NAME = "customer_documents";
    const SIGNED_URL_SECONDS = 600;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB


    /* =========================================================
       DOCUMENT TYPES
    ========================================================= */

    const DOCUMENT_TYPES = [
        "Quotation",
        "Proposal",
        "Company Profile",
        "Other"
    ];


    /* =========================================================
       SUPABASE
    ========================================================= */

    function getSupabase() {
        return window.supabaseClient || null;
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatFileSize(bytes) {
        const size = Number(bytes || 0);

        if (size < 1024) {
            return `${size} B`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }


    function formatDate(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    function getCustomerId() {
        return (
            window.crmCurrentCustomerId ||
            window.crmCurrentCustomer?.id ||
            null
        );
    }


    function getCurrentRole() {
        return String(
            window.currentProfile?.role || ""
        ).trim();
    }


    /*
     * DELETE PDF:
     * Admin + Sales diperbolehkan.
     */
    function canDeleteDocuments() {
        const role = getCurrentRole().toLowerCase();

        return (
            role === "admin" ||
            role === "sales" ||
            role === "owner" ||
            role === "administrator"
        );
    }


    function isAdmin() {
        const role = getCurrentRole().toLowerCase();

        return (
            role === "admin" ||
            role === "owner" ||
            role === "administrator"
        );
    }


    function isSales() {
        return getCurrentRole().toLowerCase() === "sales";
    }


    function showMessage(message, type = "info") {
        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showToast === "function"
        ) {
            window.FSIHelpers.showToast(message, type);
            return;
        }

        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }

        alert(message);
    }


    function getProfileContainer() {
        return document.getElementById(
            "customer-profile-container"
        );
    }


    /* =========================================================
       STYLES
    ========================================================= */

    function injectStyles() {
        if (document.getElementById("fsi-customer-documents-styles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "fsi-customer-documents-styles";

        style.textContent = `
            .fsi-documents-card {
                margin-top: 20px;
                padding: 20px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
            }

            .fsi-documents-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 18px;
            }

            .fsi-documents-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 18px;
                font-weight: 700;
                color: #111827;
            }

            .fsi-documents-title-icon {
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                background: rgba(239, 68, 68, 0.10);
                color: #dc2626;
            }

            .fsi-documents-upload {
                display: grid;
                grid-template-columns: 180px minmax(0, 1fr) auto;
                gap: 12px;
                align-items: end;
                padding: 16px;
                margin-bottom: 18px;
                border-radius: 12px;
                background: #f8fafc;
                border: 1px solid #e5e7eb;
            }

            .fsi-documents-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .fsi-documents-field label {
                font-size: 12px;
                font-weight: 600;
                color: #475569;
            }

            .fsi-documents-field select,
            .fsi-documents-field input[type="file"] {
                width: 100%;
                min-height: 42px;
                padding: 9px 11px;
                border: 1px solid #d1d5db;
                border-radius: 9px;
                background: #ffffff;
                font-size: 13px;
                box-sizing: border-box;
            }

            .fsi-document-btn {
                min-height: 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 8px 13px;
                border: 0;
                border-radius: 8px;
                background: #111827;
                color: #ffffff;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: 0.2s ease;
            }

            .fsi-document-btn:hover {
                transform: translateY(-1px);
                opacity: 0.92;
            }

            .fsi-document-btn:disabled {
                opacity: 0.55;
                cursor: not-allowed;
                transform: none;
            }

            .fsi-document-btn.secondary {
                background: #f1f5f9;
                color: #334155;
                border: 1px solid #e2e8f0;
            }

            .fsi-document-btn.danger {
                background: #dc2626;
                color: #ffffff;
            }

            .fsi-document-btn svg {
                width: 15px;
                height: 15px;
            }

            .fsi-document-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .fsi-document-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                padding: 13px 14px;
                border: 1px solid #e5e7eb;
                border-radius: 11px;
                background: #ffffff;
            }

            .fsi-document-info {
                min-width: 0;
                flex: 1;
            }

            .fsi-document-name {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                font-size: 14px;
                font-weight: 600;
                color: #111827;
            }

            .fsi-document-name span {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .fsi-document-name svg {
                flex: 0 0 auto;
                width: 18px;
                height: 18px;
                color: #dc2626;
            }

            .fsi-document-meta {
                margin-top: 5px;
                font-size: 11px;
                color: #64748b;
            }

            .fsi-document-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-wrap: wrap;
                gap: 7px;
            }

            .fsi-documents-empty {
                padding: 25px 15px;
                text-align: center;
                color: #64748b;
                font-size: 13px;
                border: 1px dashed #cbd5e1;
                border-radius: 11px;
                background: #f8fafc;
            }

            .fsi-documents-loading {
                padding: 20px;
                text-align: center;
                color: #64748b;
                font-size: 13px;
            }

            @media (max-width: 768px) {
                .fsi-documents-upload {
                    grid-template-columns: 1fr;
                }

                .fsi-document-item {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .fsi-document-actions {
                    width: 100%;
                    justify-content: flex-start;
                }

                .fsi-document-actions .fsi-document-btn {
                    flex: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* =========================================================
       RENDER DOCUMENT SECTION
    ========================================================= */

    function renderDocumentsSection() {
        const container = getProfileContainer();

        if (!container) {
            return;
        }

        /*
         * Jangan duplicate section.
         */
        let section = document.getElementById(
            "fsiCustomerDocuments"
        );

        if (section) {
            loadDocuments();
            return;
        }

        section = document.createElement("section");

        section.id = "fsiCustomerDocuments";
        section.className = "fsi-documents-card";

        section.innerHTML = `
            <div class="fsi-documents-header">
                <div class="fsi-documents-title">
                    <div class="fsi-documents-title-icon">
                        <i data-lucide="file-text"></i>
                    </div>

                    <span>Customer Documents</span>
                </div>
            </div>

            <div class="fsi-documents-upload">

                <div class="fsi-documents-field">
                    <label for="fsiDocumentType">
                        Document Type
                    </label>

                    <select id="fsiDocumentType">
                        ${DOCUMENT_TYPES.map(
                            type =>
                                `<option value="${escapeHTML(type)}">
                                    ${escapeHTML(type)}
                                </option>`
                        ).join("")}
                    </select>
                </div>

                <div class="fsi-documents-field">
                    <label for="fsiDocumentFile">
                        PDF File
                    </label>

                    <input
                        id="fsiDocumentFile"
                        type="file"
                        accept="application/pdf,.pdf"
                    />
                </div>

                <button
                    type="button"
                    class="fsi-document-btn"
                    id="fsiUploadDocumentBtn"
                >
                    <i data-lucide="upload"></i>
                    <span>Upload PDF</span>
                </button>

            </div>

            <div
                id="fsiDocumentList"
                class="fsi-document-list"
            >
                <div class="fsi-documents-loading">
                    Loading documents...
                </div>
            </div>
        `;

        container.appendChild(section);

        const uploadButton = document.getElementById(
            "fsiUploadDocumentBtn"
        );

        if (uploadButton) {
            uploadButton.addEventListener(
                "click",
                uploadDocument
            );
        }

        refreshLucideIcons();

        loadDocuments();
    }


    /* =========================================================
       LUCIDE
    ========================================================= */

    function refreshLucideIcons() {
        try {
            if (
                window.lucide &&
                typeof window.lucide.createIcons === "function"
            ) {
                window.lucide.createIcons();
            }
        } catch (error) {
            console.warn(
                "Lucide icon refresh failed:",
                error
            );
        }
    }


    /* =========================================================
       LOAD DOCUMENTS
    ========================================================= */

    async function loadDocuments() {
        const supabase = getSupabase();
        const customerId = getCustomerId();

        const list = document.getElementById(
            "fsiDocumentList"
        );

        if (!list) {
            return;
        }

        if (!supabase) {
            list.innerHTML = `
                <div class="fsi-documents-empty">
                    Supabase client is not available.
                </div>
            `;
            return;
        }

        if (!customerId) {
            list.innerHTML = `
                <div class="fsi-documents-empty">
                    Customer ID not found.
                </div>
            `;
            return;
        }

        list.innerHTML = `
            <div class="fsi-documents-loading">
                Loading documents...
            </div>
        `;

        try {
            const {
                data,
                error
            } = await supabase
                .from(TABLE_NAME)
                .select(`
                    id,
                    customer_id,
                    document_type,
                    file_name,
                    file_path,
                    file_size,
                    mime_type,
                    uploaded_by,
                    uploaded_at
                `)
                .eq("customer_id", customerId)
                .order("uploaded_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            renderDocumentList(data || []);

        } catch (error) {
            console.error(
                "Load customer documents error:",
                error
            );

            list.innerHTML = `
                <div class="fsi-documents-empty">
                    Failed to load documents.
                </div>
            `;

            showMessage(
                error?.message ||
                "Failed to load documents.",
                "error"
            );
        }
    }


    /* =========================================================
       RENDER DOCUMENT LIST
    ========================================================= */

    function renderDocumentList(documents) {
        const list = document.getElementById(
            "fsiDocumentList"
        );

        if (!list) {
            return;
        }

        if (!documents || documents.length === 0) {
            list.innerHTML = `
                <div class="fsi-documents-empty">
                    No PDF documents uploaded yet.
                </div>
            `;

            return;
        }

        const allowDelete = canDeleteDocuments();

        list.innerHTML = documents
            .map(doc => {

                const deleteButton = allowDelete
                    ? `
                        <button
                            type="button"
                            class="fsi-document-btn danger"
                            data-document-delete="${escapeHTML(doc.id)}"
                        >
                            <i data-lucide="trash-2"></i>
                            <span>Delete</span>
                        </button>
                    `
                    : "";

                return `
                    <div
                        class="fsi-document-item"
                        data-document-id="${escapeHTML(doc.id)}"
                    >

                        <div class="fsi-document-info">

                            <div class="fsi-document-name">
                                <i data-lucide="file-text"></i>

                                <span title="${escapeHTML(doc.file_name)}">
                                    ${escapeHTML(doc.file_name)}
                                </span>
                            </div>

                            <div class="fsi-document-meta">
                                ${escapeHTML(doc.document_type || "Other")}
                                &nbsp;•&nbsp;
                                ${formatFileSize(doc.file_size)}
                                &nbsp;•&nbsp;
                                ${formatDate(doc.uploaded_at)}
                            </div>

                        </div>

                        <div class="fsi-document-actions">

                            <button
                                type="button"
                                class="fsi-document-btn secondary"
                                data-document-preview="${escapeHTML(doc.id)}"
                            >
                                <i data-lucide="eye"></i>
                                <span>Preview</span>
                            </button>

                            <button
                                type="button"
                                class="fsi-document-btn secondary"
                                data-document-download="${escapeHTML(doc.id)}"
                            >
                                <i data-lucide="download"></i>
                                <span>Download</span>
                            </button>

                            ${deleteButton}

                        </div>

                    </div>
                `;
            })
            .join("");

        /*
         * Preview
         */
        list
            .querySelectorAll(
                "[data-document-preview]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {
                        openDocument(
                            button.dataset.documentPreview
                        );
                    }
                );

            });


        /*
         * Download
         */
        list
            .querySelectorAll(
                "[data-document-download]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {
                        downloadDocument(
                            button.dataset.documentDownload
                        );
                    }
                );

            });


        /*
         * DELETE
         *
         * Admin + Sales
         */
        list
            .querySelectorAll(
                "[data-document-delete]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {
                        deleteDocument(
                            button.dataset.documentDelete,
                            button
                        );
                    }
                );

            });


        refreshLucideIcons();
    }


    /* =========================================================
       UPLOAD DOCUMENT
    ========================================================= */

    async function uploadDocument() {
        const supabase = getSupabase();
        const customerId = getCustomerId();

        const typeInput = document.getElementById(
            "fsiDocumentType"
        );

        const fileInput = document.getElementById(
            "fsiDocumentFile"
        );

        const uploadButton = document.getElementById(
            "fsiUploadDocumentBtn"
        );

        if (!supabase) {
            showMessage(
                "Supabase client is not available.",
                "error"
            );
            return;
        }

        if (!customerId) {
            showMessage(
                "Customer ID not found.",
                "error"
            );
            return;
        }

        const file =
            fileInput?.files?.[0] || null;

        if (!file) {
            showMessage(
                "Please select a PDF file.",
                "error"
            );
            return;
        }

        /*
         * PDF validation
         */
        const isPDF =
            file.type === "application/pdf" ||
            file.name
                .toLowerCase()
                .endsWith(".pdf");

        if (!isPDF) {
            showMessage(
                "Only PDF files are allowed.",
                "error"
            );
            return;
        }


        /*
         * File size validation
         */
        if (file.size > MAX_FILE_SIZE) {
            showMessage(
                "Maximum PDF file size is 10 MB.",
                "error"
            );
            return;
        }


        try {
            /*
             * Get authenticated user
             */
            const {
                data: authData,
                error: authError
            } = await supabase.auth.getUser();

            if (authError) {
                throw authError;
            }

            const user =
                authData?.user || null;

            if (!user) {
                showMessage(
                    "You are not logged in.",
                    "error"
                );
                return;
            }


            /*
             * Disable upload button
             */
            if (uploadButton) {
                uploadButton.disabled = true;

                uploadButton.innerHTML = `
                    <i data-lucide="loader-2"></i>
                    <span>Uploading...</span>
                `;

                refreshLucideIcons();
            }


            /*
             * Safe filename
             */
            const safeFileName =
                file.name
                    .replace(/[^a-zA-Z0-9._-]/g, "_")
                    .replace(/_+/g, "_");


            /*
             * Storage path
             */
            const uniqueId =
                typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random()
                          .toString(36)
                          .slice(2)}`;

            const filePath =
                `${customerId}/${Date.now()}_${uniqueId}_${safeFileName}`;


            /*
             * Upload to Storage
             */
            const {
                error: uploadError
            } = await supabase
                .storage
                .from(BUCKET_NAME)
                .upload(
                    filePath,
                    file,
                    {
                        contentType: "application/pdf",
                        upsert: false
                    }
                );

            if (uploadError) {
                throw uploadError;
            }


            /*
             * Insert DB record
             */
            const {
                error: insertError
            } = await supabase
                .from(TABLE_NAME)
                .insert({
                    customer_id: customerId,
                    document_type:
                        typeInput?.value || "Other",
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    mime_type:
                        file.type || "application/pdf",
                    uploaded_by: user.id
                });

            /*
             * If database insert fails,
             * remove uploaded Storage file.
             */
            if (insertError) {

                try {
                    await supabase
                        .storage
                        .from(BUCKET_NAME)
                        .remove([
                            filePath
                        ]);
                } catch (cleanupError) {
                    console.warn(
                        "Storage cleanup failed:",
                        cleanupError
                    );
                }

                throw insertError;
            }


            /*
             * Reset input
             */
            if (fileInput) {
                fileInput.value = "";
            }

            showMessage(
                "PDF uploaded successfully.",
                "success"
            );

            await loadDocuments();

        } catch (error) {

            console.error(
                "Upload document error:",
                error
            );

            showMessage(
                error?.message ||
                "Failed to upload PDF.",
                "error"
            );

        } finally {

            /*
             * Restore upload button
             */
            if (uploadButton) {

                uploadButton.disabled = false;

                uploadButton.innerHTML = `
                    <i data-lucide="upload"></i>
                    <span>Upload PDF</span>
                `;

                refreshLucideIcons();
            }
        }
    }


    /* =========================================================
       GET DOCUMENT
    ========================================================= */

    async function getDocument(documentId) {
        const supabase = getSupabase();

        if (!supabase) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        if (!documentId) {
            throw new Error(
                "Document ID is missing."
            );
        }

        const {
            data,
            error
        } = await supabase
            .from(TABLE_NAME)
            .select(`
                id,
                customer_id,
                document_type,
                file_name,
                file_path,
                file_size,
                mime_type,
                uploaded_by,
                uploaded_at
            `)
            .eq("id", documentId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "Document not found."
            );
        }

        return data;
    }


    /* =========================================================
       PREVIEW DOCUMENT
    ========================================================= */

    async function openDocument(documentId) {
        const supabase = getSupabase();

        if (!supabase) {
            showMessage(
                "Supabase client is not available.",
                "error"
            );
            return;
        }

        try {

            const doc =
                await getDocument(documentId);

            const {
                data,
                error
            } = await supabase
                .storage
                .from(BUCKET_NAME)
                .createSignedUrl(
                    doc.file_path,
                    SIGNED_URL_SECONDS
                );

            if (error) {
                throw error;
            }

            if (!data?.signedUrl) {
                throw new Error(
                    "Could not create PDF preview URL."
                );
            }

            window.open(
                data.signedUrl,
                "_blank",
                "noopener,noreferrer"
            );

        } catch (error) {

            console.error(
                "Preview document error:",
                error
            );

            showMessage(
                error?.message ||
                "Failed to preview PDF.",
                "error"
            );
        }
    }


    /* =========================================================
       DOWNLOAD DOCUMENT
    ========================================================= */

    async function downloadDocument(documentId) {
        const supabase = getSupabase();

        if (!supabase) {
            showMessage(
                "Supabase client is not available.",
                "error"
            );
            return;
        }

        try {

            const doc =
                await getDocument(documentId);

            const {
                data,
                error
            } = await supabase
                .storage
                .from(BUCKET_NAME)
                .download(
                    doc.file_path
                );

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error(
                    "PDF file could not be downloaded."
                );
            }


            /*
             * Create temporary browser URL
             */
            const objectUrl =
                URL.createObjectURL(data);

            const anchor =
                document.createElement("a");

            anchor.href = objectUrl;

            anchor.download =
                doc.file_name ||
                "document.pdf";

            document.body.appendChild(anchor);

            anchor.click();

            anchor.remove();

            /*
             * Cleanup
             */
            setTimeout(() => {
                URL.revokeObjectURL(
                    objectUrl
                );
            }, 1000);

        } catch (error) {

            console.error(
                "Download document error:",
                error
            );

            showMessage(
                error?.message ||
                "Failed to download PDF.",
                "error"
            );
        }
    }


    /* =========================================================
       DELETE DOCUMENT
    ========================================================= */

    async function deleteDocument(
        documentId,
        clickedButton = null
    ) {

        const supabase = getSupabase();

        /*
         * DELETE hanya untuk Admin + Sales
         */
        if (!canDeleteDocuments()) {

            showMessage(
                "You do not have permission to delete documents.",
                "error"
            );

            return;
        }


        if (!supabase) {

            showMessage(
                "Supabase client is not available.",
                "error"
            );

            return;
        }


        if (!documentId) {

            showMessage(
                "Document ID is missing.",
                "error"
            );

            return;
        }


        /*
         * Prevent double click
         */
        if (
            clickedButton &&
            clickedButton.disabled
        ) {
            return;
        }


        try {

            /*
             * Get document record first
             */
            const doc =
                await getDocument(documentId);


            /*
             * Confirmation
             */
            const confirmed =
                window.confirm(
                    `Hapus document "${doc.file_name}"?`
                );

            if (!confirmed) {
                return;
            }


            /*
             * Disable clicked button
             */
            if (clickedButton) {

                clickedButton.disabled = true;

                clickedButton.innerHTML = `
                    <i data-lucide="loader-2"></i>
                    <span>Deleting...</span>
                `;

                refreshLucideIcons();
            }


            /*
             * =================================================
             * DELETE DATABASE RECORD FIRST
             *
             * This keeps the record operation controlled.
             * If DB deletion fails, the Storage file remains.
             * =================================================
             */

            const {
                error: deleteDbError
            } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq("id", documentId);


            if (deleteDbError) {
                throw deleteDbError;
            }


            /*
             * =================================================
             * DELETE STORAGE FILE
             * =================================================
             */

            const {
                error: deleteStorageError
            } = await supabase
                .storage
                .from(BUCKET_NAME)
                .remove([
                    doc.file_path
                ]);


            /*
             * Important:
             * DB record has already been deleted.
             *
             * If Storage deletion fails, the PDF can become
             * an orphan file in Storage, but the CRM record
             * will not remain pointing to a missing file.
             */
            if (deleteStorageError) {

                console.error(
                    "Storage delete failed:",
                    deleteStorageError
                );

                showMessage(
                    "Document record deleted, but the Storage file could not be removed. Please contact Admin to clean up the file.",
                    "warning"
                );

                await loadDocuments();

                return;
            }


            /*
             * Success
             */
            showMessage(
                "PDF deleted successfully.",
                "success"
            );


            /*
             * Refresh list
             */
            await loadDocuments();

        } catch (error) {

            console.error(
                "Delete document error:",
                error
            );

            showMessage(
                error?.message ||
                "Failed to delete PDF.",
                "error"
            );

        } finally {

            /*
             * Restore button only if it still exists.
             */
            if (
                clickedButton &&
                document.body.contains(clickedButton)
            ) {

                clickedButton.disabled = false;

                clickedButton.innerHTML = `
                    <i data-lucide="trash-2"></i>
                    <span>Delete</span>
                `;

                refreshLucideIcons();
            }
        }
    }


    /* =========================================================
       ATTACH TO CUSTOMER PROFILE
    ========================================================= */

    function attachToCustomerProfile() {

        if (
            typeof window.crmOpenCustomerProfile !==
            "function"
        ) {
            return false;
        }


        /*
         * Jangan wrap berkali-kali.
         */
        if (
            window.crmOpenCustomerProfile
                .__fsiDocumentsAttached
        ) {
            return true;
        }


        const originalOpen =
            window.crmOpenCustomerProfile;


        async function wrappedOpenCustomerProfile(
            customerId
        ) {

            const result =
                await originalOpen(customerId);


            /*
             * Wait until Customer Profile DOM
             * has finished rendering.
             */
            setTimeout(() => {

                renderDocumentsSection();

            }, 100);


            return result;
        }


        wrappedOpenCustomerProfile
            .__fsiDocumentsAttached = true;


        window.crmOpenCustomerProfile =
            wrappedOpenCustomerProfile;


        /*
         * Keep aliases synchronized.
         */
        window.openCustomerProfile =
            wrappedOpenCustomerProfile;

        window.crmOpenShelter =
            wrappedOpenCustomerProfile;


        if (window.FSICustomerProfile) {

            window.FSICustomerProfile.open =
                wrappedOpenCustomerProfile;
        }


        return true;
    }


    /* =========================================================
       INIT
    ========================================================= */

    function init() {

        injectStyles();

        /*
         * Customer Profile may load after this file.
         * Retry attachment.
         */
        let attempts = 0;

        const maxAttempts = 50;

        const timer =
            setInterval(() => {

                attempts++;

                const attached =
                    attachToCustomerProfile();

                if (
                    attached ||
                    attempts >= maxAttempts
                ) {
                    clearInterval(timer);
                }

            }, 200);
    }


    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.FSICustomerDocuments = {

        load: loadDocuments,

        upload: uploadDocument,

        preview: openDocument,

        download: downloadDocument,

        remove: deleteDocument,

        render: renderDocumentsSection

    };


    /* =========================================================
       DOM READY
    ========================================================= */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
