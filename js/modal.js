// ========================================
// CRM FSI - MODAL & PROFILE
// ========================================


// ========================================
// MODAL EVENTS
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // Tombol dengan data-close
    document
      .querySelectorAll(
        "[data-close]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            closeModal(
              button.dataset.close
            );

          }
        );

      });


    // Klik area luar modal
    document
      .querySelectorAll(
        ".modal-overlay"
      )
      .forEach((overlay) => {

        overlay.addEventListener(
          "click",
          (event) => {

            if (
              event.target === overlay &&
              overlay.dataset.locked !==
                "true"
            ) {

              closeModal(
                overlay.id
              );

            }

          }
        );

      });

  }
);


// ========================================
// OPEN MODAL
// ========================================

function openModal(id) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    "active"
  );

  modal.style.display =
    "flex";


  // Prevent background scrolling
  document.body.classList.add(
    "modal-open"
  );
}


// ========================================
// CLOSE MODAL
// ========================================

function closeModal(id) {

  const modal =
    $(id);


  if (!modal) {
    return;
  }


  if (
    modal.dataset.locked ===
    "true"
  ) {
    return;
  }


  modal.classList.remove(
    "active"
  );

  modal.style.display =
    "none";


  // Restore scrolling
  document.body.classList.remove(
    "modal-open"
  );
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
            currentProfile.name
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
            currentProfile.role
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
