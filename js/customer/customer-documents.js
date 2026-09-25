// ============================================================
// FSI CRM - CUSTOMER DOCUMENTS
// ============================================================
// Fungsi:
// 1. Upload PDF customer
// 2. List dokumen customer
// 3. Preview PDF
// 4. Download PDF
// 5. Delete PDF
//
// Storage:
// - Supabase Storage
// - Bucket: customer-documents
//
// Database:
// - customer_documents
//
// Document Types:
// - Quotation
// - Proposal
// - Company Profile
// - Other
// ============================================================

(function () {

    "use strict";


    // ========================================================
    // CONFIG
    // ========================================================

    const BUCKET_NAME =
        "customer-documents";

    const SIGNED_URL_SECONDS =
        600;

    const MAX_FILE_SIZE =
        10 * 1024 * 1024;


    // ========================================================
    // HELPERS
    // ========================================================

    function getSupabase() {

        return window.supabaseClient || null;

    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function formatFileSize(bytes) {

        const size =
            Number(bytes || 0);

        if (size < 1024) {

            return size + " B";

        }

        if (size < 1024 * 1024) {

            return (
                (size / 1024).toFixed(1) +
                " KB"
            );

        }

        return (
            (size / (1024 * 1024)).toFixed(1) +
            " MB"
        );

    }


    function formatDate(value) {

        if (!value) {
            return "-";
        }

        try {

            const date =
                new Date(value);

            if (Number.isNaN(date.getTime())) {

                return String(value);

            }

            return new Intl.DateTimeFormat(
                "id-ID",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ).format(date);

        } catch (error) {

            return String(value);

        }

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
        )
            .trim()
            .toLowerCase();

    }


    function isAdmin() {

        const role =
            getCurrentRole();

        return (
            role === "admin" ||
            role === "owner" ||
            role === "administrator"
        );

    }


    function showMessage(
        message,
        type
    ) {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showToast ===
            "function"
        ) {

            window.FSIHelpers.showToast(
                message,
                type || "info"
            );

            return;

        }

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                type || "info"
            );

            return;

        }

        console.log(
            "FSI CRM:",
            message
        );

    }


    // ========================================================
    // CSS
    // ========================================================

    function injectStyles() {

        if (
            document.getElementById(
                "fsi-customer-documents-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement("style");

        style.id =
            "fsi-customer-documents-styles";


        style.textContent = `

            .fsi-documents-card {
                margin-top: 20px;
            }

            .fsi-documents-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                flex-wrap: wrap;
            }

            .fsi-documents-header-left {
                min-width: 0;
            }

            .fsi-documents-title {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
            }

            .fsi-documents-subtitle {
                margin: 5px 0 0;
                color: #64748b;
                font-size: 13px;
            }

            .fsi-documents-upload-grid {
                display: grid;
                grid-template-columns:
                    minmax(180px, 220px)
                    minmax(220px, 1fr)
                    auto;
                gap: 12px;
                align-items: end;
                margin-top: 18px;
            }

            .fsi-documents-field {
                display: flex;
                flex-direction: column;
                gap: 7px;
            }

            .fsi-documents-field label {
                font-size: 12px;
                font-weight: 700;
                color: #334155;
            }

            .fsi-documents-field input,
            .fsi-documents-field select {
                width: 100%;
                min-height: 42px;
                border: 1px solid #dbe3ef;
                border-radius: 10px;
                padding: 10px 12px;
                background: #fff;
                color: #0f172a;
                box-sizing: border-box;
            }

            .fsi-documents-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .fsi-document-list {
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .fsi-document-empty {
                border: 1px dashed #cbd5e1;
                border-radius: 12px;
                padding: 22px;
                text-align: center;
                color: #64748b;
                background: #f8fafc;
            }

            .fsi-document-item {
                display: grid;
                grid-template-columns: 42px minmax(0, 1fr) auto;
                gap: 12px;
                align-items: center;
                padding: 12px 14px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #fff;
            }

            .fsi-document-icon {
                width: 42px;
                height: 42px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #eff6ff;
                color: #2563eb;
                font-size: 17px;
                font-weight: 800;
            }

            .fsi-document-main {
                min-width: 0;
            }

            .fsi-document-name {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                word-break: break-word;
            }

            .fsi-document-meta {
                margin-top: 4px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                color: #64748b;
                font-size: 12px;
            }

            .fsi-document-type {
                color: #2563eb;
                font-weight: 700;
            }

            .fsi-document-buttons {
                display: flex;
                gap: 7px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .fsi-document-btn {
                border: 1px solid #dbe3ef;
                background: #fff;
                color: #1e293b;
                border-radius: 8px;
                padding: 8px 10px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
            }

            .fsi-document-btn:hover {
                background: #f8fafc;
            }

            .fsi-document-btn.primary {
                border-color: #2563eb;
                background: #2563eb;
                color: #fff;
            }

            .fsi-document-btn.danger {
                color: #dc2626;
                border-color: #fecaca;
                background: #fff;
            }

            .fsi-documents-loading {
                padding: 20px;
                text-align: center;
                color: #64748b;
            }

            @media (max-width: 800px) {

                .fsi-documents-upload-grid {
                    grid-template-columns: 1fr;
                }

                .fsi-document-item {
                    grid-template-columns:
                        42px
                        minmax(0, 1fr);
                }

                .fsi-document-buttons {
                    grid-column: 1 / -1;
                    justify-content: flex-start;
                }

            }

        `;

        document.head.appendChild(style);

    }


    // ========================================================
    // RENDER SECTION
    // ========================================================

    function renderDocumentsSection() {

        const page =
            document.getElementById(
                "customerProfilePage"
            );

        if (!page) {
            return;
        }


        const existing =
            document.getElementById(
                "fsiCustomerDocuments"
            );

        if (existing) {

            loadDocuments();

            return;

        }


        const wrapper =
            document.createElement("div");

        wrapper.id =
            "fsiCustomerDocuments";

        wrapper.className =
            "panel crm-edit-card fsi-documents-card";


        wrapper.innerHTML = `

            <div class="fsi-documents-header">

                <div class="fsi-documents-header-left">

                    <div class="eyebrow">
                        CUSTOMER DOCUMENTS
                    </div>

                    <h3 class="fsi-documents-title">
                        Customer Documents
                    </h3>

                    <p class="fsi-documents-subtitle">
                        Upload quotation, proposal, company profile,
                        or other customer documents.
                    </p>

                </div>

            </div>


            <div class="fsi-documents-upload-grid">

                <div class="fsi-documents-field">

                    <label for="fsiDocumentType">
                        Document Type
                    </label>

                    <select id="fsiDocumentType">

                        <option value="Quotation">
                            Quotation
                        </option>

                        <option value="Proposal">
                            Proposal
                        </option>

                        <option value="Company Profile">
                            Company Profile
                        </option>

                        <option value="Other">
                            Other
                        </option>

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
                    >

                </div>


                <div class="fsi-documents-actions">

                    <button
                        type="button"
                        id="fsiDocumentUploadBtn"
                        class="primary-btn"
                    >
                        Upload PDF
                    </button>

                </div>

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


        const editPage =
            page.querySelector(
                ".crm-full-edit-page"
            );


        if (editPage) {

            editPage.appendChild(
                wrapper
            );

        } else {

            page.appendChild(
                wrapper
            );

        }


        const uploadButton =
            document.getElementById(
                "fsiDocumentUploadBtn"
            );


        if (uploadButton) {

            uploadButton.addEventListener(
                "click",
                uploadDocument
            );

        }


        loadDocuments();

    }


    // ========================================================
    // LOAD DOCUMENTS
    // ========================================================

    async function loadDocuments() {

        const customerId =
            getCustomerId();

        const list =
            document.getElementById(
                "fsiDocumentList"
            );


        if (!list) {
            return;
        }


        if (!customerId) {

            list.innerHTML = `

                <div class="fsi-document-empty">
                    Customer belum dipilih.
                </div>

            `;

            return;

        }


        const supabase =
            getSupabase();


        if (!supabase) {

            list.innerHTML = `

                <div class="fsi-document-empty">
                    Supabase belum tersedia.
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

            const result =
                await supabase
                    .from("customer_documents")
                    .select(
                        `
                        id,
                        customer_id,
                        document_type,
                        file_name,
                        file_path,
                        file_size,
                        mime_type,
                        uploaded_by,
                        uploaded_at
                        `
                    )
                    .eq(
                        "customer_id",
                        customerId
                    )
                    .order(
                        "uploaded_at",
                        {
                            ascending: false
                        }
                    );


            if (result.error) {

                throw result.error;

            }


            const documents =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            renderDocumentList(
                documents
            );

        } catch (error) {

            console.error(
                "FSI CRM: Load customer documents error:",
                error
            );


            list.innerHTML = `

                <div class="fsi-document-empty">

                    Failed to load documents.

                    <br>

                    <small>
                        ${escapeHTML(
                            error?.message ||
                            "Unknown error"
                        )}
                    </small>

                </div>

            `;

        }

    }


    // ========================================================
    // RENDER DOCUMENT LIST
    // ========================================================

    function renderDocumentList(
        documents
    ) {

        const list =
            document.getElementById(
                "fsiDocumentList"
            );


        if (!list) {
            return;
        }


        if (!documents.length) {

            list.innerHTML = `

                <div class="fsi-document-empty">
                    Belum ada document untuk customer ini.
                </div>

            `;

            return;

        }


        list.innerHTML =
            documents
                .map(function (document) {

                    return `

                        <div
                            class="fsi-document-item"
                            data-document-id="${escapeHTML(
                                document.id
                            )}"
                        >

                            <div class="fsi-document-icon">
                                PDF
                            </div>


                            <div class="fsi-document-main">

                                <div class="fsi-document-name">

                                    ${escapeHTML(
                                        document.file_name
                                    )}

                                </div>


                                <div class="fsi-document-meta">

                                    <span class="fsi-document-type">

                                        ${escapeHTML(
                                            document.document_type
                                        )}

                                    </span>

                                    <span>
                                        ${formatFileSize(
                                            document.file_size
                                        )}
                                    </span>

                                    <span>
                                        ${formatDate(
                                            document.uploaded_at
                                        )}
                                    </span>

                                </div>

                            </div>


                            <div class="fsi-document-buttons">

                                <button
                                    type="button"
                                    class="fsi-document-btn primary"
                                    data-document-view="${escapeHTML(
                                        document.id
                                    )}"
                                >
                                    Preview
                                </button>


                                <button
                                    type="button"
                                    class="fsi-document-btn"
                                    data-document-download="${escapeHTML(
                                        document.id
                                    )}"
                                >
                                    Download
                                </button>


                                ${
                                    isAdmin()
                                    ? `
                                        <button
                                            type="button"
                                            class="fsi-document-btn danger"
                                            data-document-delete="${escapeHTML(
                                                document.id
                                            )}"
                                        >
                                            Delete
                                        </button>
                                    `
                                    : ""
                                }

                            </div>

                        </div>

                    `;

                })
                .join("");


        list
            .querySelectorAll(
                "[data-document-view]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openDocument(
                            button.dataset.documentView
                        );

                    }
                );

            });


        list
            .querySelectorAll(
                "[data-document-download]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        downloadDocument(
                            button.dataset.documentDownload
                        );

                    }
                );

            });


        list
            .querySelectorAll(
                "[data-document-delete]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        deleteDocument(
                            button.dataset.documentDelete
                        );

                    }
                );

            });

    }


    // ========================================================
    // UPLOAD
    // ========================================================

    async function uploadDocument() {

        const supabase =
            getSupabase();


        if (!supabase) {

            showMessage(
                "Supabase belum tersedia.",
                "error"
            );

            return;

        }


        const customerId =
            getCustomerId();


        if (!customerId) {

            showMessage(
                "Customer belum dipilih.",
                "error"
            );

            return;

        }


        const fileInput =
            document.getElementById(
                "fsiDocumentFile"
            );


        const typeInput =
            document.getElementById(
                "fsiDocumentType"
            );


        if (!fileInput) {
            return;
        }


        const file =
            fileInput.files?.[0];


        if (!file) {

            showMessage(
                "Pilih file PDF terlebih dahulu.",
                "warning"
            );

            return;

        }


        const lowerName =
            String(
                file.name || ""
            ).toLowerCase();


        const isPDF =
            file.type === "application/pdf" ||
            lowerName.endsWith(".pdf");


        if (!isPDF) {

            showMessage(
                "Hanya file PDF yang diperbolehkan.",
                "error"
            );

            return;

        }


        if (
            Number(file.size || 0) >
            MAX_FILE_SIZE
        ) {

            showMessage(
                "Ukuran PDF maksimal 10 MB.",
                "error"
            );

            return;

        }


        const type =
            typeInput?.value ||
            "Quotation";


        const uploadButton =
            document.getElementById(
                "fsiDocumentUploadBtn"
            );


        try {

            if (uploadButton) {

                uploadButton.disabled = true;

                uploadButton.textContent =
                    "Uploading...";

            }


            const authResult =
                await supabase.auth.getUser();


            if (
                authResult.error ||
                !authResult.data?.user
            ) {

                throw (
                    authResult.error ||
                    new Error(
                        "User login tidak ditemukan."
                    )
                );

            }


            const user =
                authResult.data.user;


            const safeFileName =
                file.name
                    .replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );


            const uniqueName =
                [
                    Date.now(),
                    crypto.randomUUID(),
                    safeFileName
                ].join("_");


            const filePath =
                String(customerId) +
                "/" +
                uniqueName;


            // ------------------------------------------------
            // STORAGE UPLOAD
            // ------------------------------------------------

            const uploadResult =
                await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(
                        filePath,
                        file,
                        {
                            contentType:
                                "application/pdf",

                            cacheControl:
                                "3600",

                            upsert:
                                false
                        }
                    );


            if (uploadResult.error) {

                throw uploadResult.error;

            }


            // ------------------------------------------------
            // DATABASE RECORD
            // ------------------------------------------------

            const insertResult =
                await supabase
                    .from(
                        "customer_documents"
                    )
                    .insert({

                        customer_id:
                            customerId,

                        document_type:
                            type,

                        file_name:
                            file.name,

                        file_path:
                            filePath,

                        file_size:
                            file.size,

                        mime_type:
                            "application/pdf",

                        uploaded_by:
                            user.id

                    });


            if (insertResult.error) {

                // Try to clean up uploaded
                // storage file if DB insert fails.

                await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([
                        filePath
                    ]);


                throw insertResult.error;

            }


            fileInput.value = "";


            showMessage(
                "PDF berhasil di-upload.",
                "success"
            );


            await loadDocuments();

        } catch (error) {

            console.error(
                "FSI CRM: Upload customer document error:",
                error
            );


            showMessage(
                error?.message ||
                "Gagal upload PDF.",
                "error"
            );

        } finally {

            if (uploadButton) {

                uploadButton.disabled =
                    false;

                uploadButton.textContent =
                    "Upload PDF";

            }

        }

    }


    // ========================================================
    // GET DOCUMENT
    // ========================================================

    async function getDocument(
        documentId
    ) {

        const supabase =
            getSupabase();


        if (!supabase) {

            throw new Error(
                "Supabase belum tersedia."
            );

        }


        const result =
            await supabase
                .from("customer_documents")
                .select(
                    `
                    id,
                    customer_id,
                    document_type,
                    file_name,
                    file_path,
                    file_size,
                    mime_type,
                    uploaded_by,
                    uploaded_at
                    `
                )
                .eq(
                    "id",
                    documentId
                )
                .single();


        if (result.error) {

            throw result.error;

        }


        if (!result.data) {

            throw new Error(
                "Document tidak ditemukan."
            );

        }


        return result.data;

    }


    // ========================================================
    // PREVIEW
    // ========================================================

    async function openDocument(
        documentId
    ) {

        const supabase =
            getSupabase();


        if (!supabase) {

            showMessage(
                "Supabase belum tersedia.",
                "error"
            );

            return;

        }


        try {

            const document =
                await getDocument(
                    documentId
                );


            const result =
                await supabase.storage
                    .from(BUCKET_NAME)
                    .createSignedUrl(
                        document.file_path,
                        SIGNED_URL_SECONDS
                    );


            if (result.error) {

                throw result.error;

            }


            if (!result.data?.signedUrl) {

                throw new Error(
                    "Signed URL tidak tersedia."
                );

            }


            window.open(
                result.data.signedUrl,
                "_blank",
                "noopener,noreferrer"
            );

        } catch (error) {

            console.error(
                "FSI CRM: Preview document error:",
                error
            );


            showMessage(
                error?.message ||
                "Gagal membuka PDF.",
                "error"
            );

        }

    }


    // ========================================================
    // DOWNLOAD
    // ========================================================

    async function downloadDocument(
        documentId
    ) {

        const supabase =
            getSupabase();


        if (!supabase) {

            showMessage(
                "Supabase belum tersedia.",
                "error"
            );

            return;

        }


        try {

            const document =
                await getDocument(
                    documentId
                );


            const result =
                await supabase.storage
                    .from(BUCKET_NAME)
                    .download(
                        document.file_path
                    );


            if (result.error) {

                throw result.error;

            }


            const blob =
                result.data;


            const url =
                URL.createObjectURL(
                    blob
                );


            const anchor =
                document.createElement("a");

            anchor.href =
                url;

            anchor.download =
                document.file_name ||
                "customer-document.pdf";

            document.body.appendChild(
                anchor
            );

            anchor.click();

            anchor.remove();


            setTimeout(
                function () {

                    URL.revokeObjectURL(
                        url
                    );

                },
                1000
            );

        } catch (error) {

            console.error(
                "FSI CRM: Download document error:",
                error
            );


            showMessage(
                error?.message ||
                "Gagal download PDF.",
                "error"
            );

        }

    }


    // ========================================================
    // DELETE
    // ========================================================

    async function deleteDocument(
        documentId
    ) {

        const supabase =
            getSupabase();


        if (!supabase) {

            showMessage(
                "Supabase belum tersedia.",
                "error"
            );

            return;

        }


        try {

            const document =
                await getDocument(
                    documentId
                );


            const confirmed =
                window.confirm(
                    "Hapus document \"" +
                    document.file_name +
                    "\"?"
                );


            if (!confirmed) {
                return;
            }


            const storageResult =
                await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([
                        document.file_path
                    ]);


            if (storageResult.error) {

                throw storageResult.error;

            }


            const deleteResult =
                await supabase
                    .from(
                        "customer_documents"
                    )
                    .delete()
                    .eq(
                        "id",
                        documentId
                    );


            if (deleteResult.error) {

                throw deleteResult.error;

            }


            showMessage(
                "Document berhasil dihapus.",
                "success"
            );


            await loadDocuments();

        } catch (error) {

            console.error(
                "FSI CRM: Delete document error:",
                error
            );


            showMessage(
                error?.message ||
                "Gagal menghapus document.",
                "error"
            );

        }

    }


    // ========================================================
    // ATTACH TO CUSTOMER PROFILE
    // ========================================================

    function attachToCustomerProfile() {

        injectStyles();


        if (
            typeof window.crmRenderCustomerEditPage !==
            "function"
        ) {

            return false;

        }


        if (
            window.crmCustomerDocumentsWrapped
        ) {

            return true;

        }


        const originalRenderer =
            window.crmRenderCustomerEditPage;


        window.crmRenderCustomerEditPage =
            function (customer) {

                originalRenderer(customer);


                setTimeout(
                    function () {

                        renderDocumentsSection();

                    },
                    0
                );

            };


        window.crmCustomerDocumentsWrapped =
            true;


        return true;

    }


    function init() {

        injectStyles();


        if (
            attachToCustomerProfile()
        ) {

            return;

        }


        let attempts = 0;


        const timer =
            setInterval(
                function () {

                    attempts++;


                    if (
                        attachToCustomerProfile()
                    ) {

                        clearInterval(
                            timer
                        );

                        return;

                    }


                    if (
                        attempts >= 50
                    ) {

                        clearInterval(
                            timer
                        );

                        console.warn(
                            "FSI CRM: Customer profile renderer not found."
                        );

                    }

                },
                200
            );

    }


    // ========================================================
    // GLOBAL API
    // ========================================================

    window.FSICustomerDocuments = {

        load:
            loadDocuments,

        upload:
            uploadDocument,

        preview:
            openDocument,

        download:
            downloadDocument,

        remove:
            deleteDocument,

        render:
            renderDocumentsSection

    };


    // ========================================================
    // INITIALIZE
    // ========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
