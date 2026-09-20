// ========================================
// CRM FSI - MODAL & PROFILE
// FINAL
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    // Support both:
    // data-close="modalId"
    // data-close-modal="modalId"
    document.querySelectorAll("[data-close], [data-close-modal]")
        .forEach((button) => {

            button.addEventListener("click", (event) => {

                event.preventDefault();
                event.stopPropagation();

                const modalId =
                    button.dataset.close ||
                    button.dataset.closeModal;

                if (modalId) {
                    closeModal(modalId);
                }

            });

        });


    // Click outside modal
    document.querySelectorAll(".modal-overlay")
        .forEach((overlay) => {

            overlay.addEventListener("click", (event) => {

                if (
                    event.target === overlay &&
                    overlay.dataset.locked !== "true"
                ) {
                    closeModal(overlay.id);
                }

            });

        });


    // ESC
    document.addEventListener("keydown", (event) => {

        if (event.key !== "Escape") {
            return;
        }

        const openedModal =
            document.querySelector(".modal-overlay.active");

        if (
            openedModal &&
            openedModal.dataset.locked !== "true"
        ) {
            closeModal(openedModal.id);
        }

    });

});


// ========================================
// OPEN MODAL
// ========================================

function openModal(id) {

    const modal = $(id);

    if (!modal) {
        return;
    }

    modal.classList.add("active");

    modal.style.display = "flex";

    document.body.classList.add("modal-open");

}


// ========================================
// CLOSE MODAL
// ========================================

function closeModal(id) {

    const modal = $(id);

    if (!modal) {
        return;
    }

    if (modal.dataset.locked === "true") {
        return;
    }

    modal.classList.remove("active");

    modal.style.display = "none";

    const anotherModal =
        document.querySelector(".modal-overlay.active");

    if (!anotherModal) {
        document.body.classList.remove("modal-open");
    }

}


// ========================================
// CLOSE ALL
// ========================================

function closeAllModals() {

    document.querySelectorAll(".modal-overlay")
        .forEach((modal) => {

            if (modal.dataset.locked === "true") {
                return;
            }

            modal.classList.remove("active");
            modal.style.display = "none";

        });

    document.body.classList.remove("modal-open");

}


// ========================================
// GLOBAL LOADING
// ========================================

function showGlobalLoading() {

    const loading = $("globalLoading");

    if (!loading) {
        return;
    }

    loading.classList.add("active");
    loading.style.display = "flex";

}


function hideGlobalLoading() {

    const loading = $("globalLoading");

    if (!loading) {
        return;
    }

    loading.classList.remove("active");
    loading.style.display = "none";

}


// ========================================
// PROFILE MODAL
// ========================================

function openProfileModal() {

    const modal = $("profileModal");

    if (!modal) {
        return;
    }

    renderProfile();

    openModal("profileModal");

}


function closeProfileModal() {

    closeModal("profileModal");

}


// ========================================
// RENDER USER PROFILE
// ========================================

function renderProfile() {

    const box = $("userProfileContent");

    if (!box) {
        return;
    }

    if (!currentProfile) {

        box.innerHTML = `
            <div class="profile-empty">
                <i class="fa-solid fa-user-slash"></i>
                <p>Data profile belum tersedia.</p>
            </div>
        `;

        return;
    }


    const name =
        currentProfile.name ||
        currentProfile.username ||
        "User";

    const username =
        currentProfile.username ||
        "-";

    const role =
        currentProfile.role ||
        "Sales";

    const status =
        currentProfile.status ||
        "-";

    const createdAt =
        currentProfile.created_at;

    const userId =
        currentProfile.id ||
        "-";

    const initial =
        String(name)
            .charAt(0)
            .toUpperCase();


    box.innerHTML = `

        <div class="profile-hero compact">

            <div class="profile-avatar-xl">
                ${safeText(initial)}
            </div>

            <div>
                <h2>${safeText(name)}</h2>
                <p>${safeText(role)}</p>
            </div>

        </div>


        <div class="detail-grid">

            <div>
                <label>Name</label>
                <strong>
                    ${safeText(name)}
                </strong>
            </div>

            <div>
                <label>Username</label>
                <strong>
                    ${safeText(username)}
                </strong>
            </div>

            <div>
                <label>Role</label>
                <strong>
                    ${safeText(role)}
                </strong>
            </div>

            <div>
                <label>Status</label>
                <strong>
                    ${safeText(status)}
                </strong>
            </div>

            <div>
                <label>Created</label>
                <strong>
                    ${formatDate(createdAt)}
                </strong>
            </div>

            <div>
                <label>User ID</label>
                <strong>
                    ${safeText(userId)}
                </strong>
            </div>

        </div>

    `;

}
