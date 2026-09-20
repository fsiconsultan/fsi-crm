// ========================================
// CRM FSI - MODAL & PROFILE
// FINAL VERSION
// ========================================


// ========================================
// MODAL EVENTS
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  // ----------------------------------------
  // Tombol dengan data-close
  // ----------------------------------------

  document
    .querySelectorAll("[data-close]")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const modalId =
          button.dataset.close;

        if (modalId) {
          closeModal(modalId);
        }

      });

    });


  // ----------------------------------------
  // Klik area luar modal
  // ----------------------------------------

  document
    .querySelectorAll(".modal-overlay")
    .forEach((overlay) => {

      overlay.addEventListener("click", (event) => {

        // Hanya tutup kalau yang diklik
        // benar-benar area overlay
        if (
          event.target === overlay &&
          overlay.dataset.locked !== "true"
        ) {

          closeModal(overlay.id);

        }

      });

    });


  // ----------------------------------------
  // Tombol ESC
  // ----------------------------------------

  document.addEventListener("keydown", (event) => {

    if (event.key !== "Escape") {
      return;
    }

    const openedModal =
      document.querySelector(
        ".modal-overlay.active"
      );

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

  // Pastikan modal sebelumnya tidak
  // mempunyai inline display yang salah
  modal.style.display = "flex";

  // Aktifkan modal
  modal.classList.add("active");

  // Kunci scroll halaman
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

  // Modal yang dikunci tidak boleh ditutup
  if (modal.dataset.locked === "true") {
    return;
  }

  // Hilangkan class aktif
  modal.classList.remove("active");

  // Hapus inline style agar CSS
  // kembali mengontrol display
  modal.style.display = "none";

  // Jika tidak ada modal lain yang terbuka,
  // aktifkan kembali scroll halaman
  const anotherModal =
    document.querySelector(
      ".modal-overlay.active"
    );

  if (!anotherModal) {
    document.body.classList.remove(
      "modal-open"
    );
  }

}


// ========================================
// CLOSE ALL MODALS
// ========================================

function closeAllModals() {

  document
    .querySelectorAll(".modal-overlay")
    .forEach((modal) => {

      if (
        modal.dataset.locked !== "true"
      ) {

        modal.classList.remove(
          "active"
        );

        modal.style.display =
          "none";

      }

    });

  document.body.classList.remove(
    "modal-open"
  );

}


// ========================================
// GLOBAL LOADING
// ========================================

function showGlobalLoading() {

  const loading =
    $("globalLoading");

  if (!loading) {
    return;
  }

  loading.classList.add(
    "active"
  );

  loading.style.display =
    "flex";

}


function hideGlobalLoading() {

  const loading =
    $("globalLoading");

  if (!loading) {
    return;
  }

  loading.classList.remove(
    "active"
  );

  loading.style.display =
    "none";

}


// ========================================
// OPEN PROFILE MODAL
// ========================================

function openProfileModal() {

  const modal =
    $("profileModal");

  if (!modal) {
    return;
  }

  renderProfile();

  openModal(
    "profileModal"
  );

}


// ========================================
// RENDER PROFILE
// ========================================

function renderProfile() {

  const box =
    $("userProfileContent");

  if (
    !box ||
    !currentProfile
  ) {
    return;
  }


  const name =
    currentProfile.name ||
    currentProfile.username ||
    "User";


  const role =
    currentProfile.role ||
    "Sales";


  const status =
    currentProfile.status ||
    "-";


  const username =
    currentProfile.username ||
    "-";


  const createdAt =
    currentProfile.created_at;


  const userId =
    currentProfile.id ||
    "-";


  const initial =
    name
      .charAt(0)
      .toUpperCase();


  box.innerHTML = `

    <div class="profile-hero compact">

      <div class="profile-avatar-xl">
        ${safeText(initial)}
      </div>

      <div>

        <h2>
          ${safeText(name)}
        </h2>

        <p>
          ${safeText(role)}
        </p>

      </div>

    </div>


    <div class="detail-grid">

      <div>

        <label>
          Name
        </label>

        <strong>
          ${safeText(
            currentProfile.name ||
            "-"
          )}
        </strong>

      </div>


      <div>

        <label>
          Username
        </label>

        <strong>
          ${safeText(
            username
          )}
        </strong>

      </div>


      <div>

        <label>
          Role
        </label>

        <strong>
          ${safeText(
            currentProfile.role ||
            "-"
          )}
        </strong>

      </div>


      <div>

        <label>
          Status
        </label>

        <strong>
          ${safeText(
            status
          )}
        </strong>

      </div>


      <div>

        <label>
          Created
        </label>

        <strong>
          ${formatDate(
            createdAt
          )}
        </strong>

      </div>


      <div>

        <label>
          User ID
        </label>

        <strong>
          ${safeText(
            userId
          )}
        </strong>

      </div>

    </div>

  `;

}


// ========================================
// CLOSE PROFILE MODAL
// ========================================

function closeProfileModal() {

  closeModal(
    "profileModal"
  );

}
