/* =========================================================
   FSI CRM - CUSTOMER PROFILE
   ========================================================= */


/* =========================================================
   OPEN CUSTOMER PROFILE
   ========================================================= */

function openCustomerProfile(id) {

  if (!id) return;


  window.location.href =
    "customer-profile.html?id=" +
    encodeURIComponent(id);

}


/* Make function globally accessible */
window.openCustomerProfile =
  openCustomerProfile;


/* =========================================================
   INITIALIZE CUSTOMER PROFILE PAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeCustomerProfilePage();

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCustomerProfilePage() {

  const content =
    $("customerProfileContent");

  if (!content) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const id =
    params.get("id");


  if (!id) {

    renderProfileError(
      "Customer ID tidak ditemukan."
    );

    return;

  }


  await loadCustomerProfilePage(
    id
  );

}


/* =========================================================
   LOAD CUSTOMER
   ========================================================= */

async function loadCustomerProfilePage(id) {

  const content =
    $("customerProfileContent");


  if (!content) return;


  selectedCustomerId =
    id;


  content.innerHTML = `

    <div class="profile-loading">

      <i class="fa-solid fa-spinner fa-spin"></i>

      <span>
        Loading customer...
      </span>

    </div>

  `;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(CRM_CONFIG.leadTable)
        .select("*")
        .eq("id", id)
        .single();


    if (error) {
      throw error;
    }


    if (!data) {

      throw new Error(
        "Customer tidak ditemukan."
      );

    }


    /* -----------------------------------------------------
       ACCESS CONTROL
    ----------------------------------------------------- */

    if (
      currentProfile?.role !== "Admin" &&
      String(data.sales_id) !==
        String(currentProfile?.id)
    ) {

      throw new Error(
        "Anda tidak memiliki akses ke customer ini."
      );

    }


    renderCustomerProfile(
      data
    );


  } catch (error) {

    console.error(
      "loadCustomerProfilePage:",
      error
    );


    renderProfileError(
      error.message ||
      "Terjadi kesalahan saat memuat customer."
    );

  }

}


/* =========================================================
   RENDER ERROR
   ========================================================= */

function renderProfileError(
  message
) {

  const content =
    $("customerProfileContent");


  if (!content) return;


  content.innerHTML = `

    <div class="empty-state">

      <i class="fa-solid fa-circle-xmark"></i>

      <h3>
        Gagal memuat customer
      </h3>

      <p>
        ${escapeHTML(
          message ||
          "Terjadi kesalahan."
        )}
      </p>

      <br>

      <a
        href="leads.html"
        class="btn btn-secondary"
      >
        <i class="fa-solid fa-arrow-left"></i>
        Kembali ke Leads
      </a>

    </div>

  `;

}


/* =========================================================
   RENDER CUSTOMER PROFILE
   ========================================================= */

function renderCustomerProfile(
  lead
) {

  const content =
    $("customerProfileContent");


  if (!content) return;


  const status =
    normalizeLeadStatus(
      lead.status
    );


  const statusClass =
    status
      .toLowerCase()
      .replace(/\s+/g, "-");


  const salesName =
    getSalesNameForProfile(
      lead.sales_id
    );


  content.innerHTML = `

    <!-- ================================================
         PROFILE HERO
    ================================================= -->

    <div class="customer-profile-hero">

      <div class="customer-profile-avatar">

        ${escapeHTML(
          (lead.customer_name || "?")
            .charAt(0)
            .toUpperCase()
        )}

      </div>


      <div class="customer-profile-main">

        <div class="customer-profile-name-row">

          <h2>
            ${escapeHTML(
              lead.customer_name || "-"
            )}
          </h2>

          <span
            class="status-badge status-${statusClass}"
          >
            ${escapeHTML(
              status || "-"
            )}
          </span>

        </div>


        <p>
          ${escapeHTML(
            lead.business || "Customer"
          )}

          ${
            lead.location
              ? `
                <span>•</span>
                ${escapeHTML(
                  lead.location
                )}
              `
              : ""
          }
        </p>

      </div>


      <div class="customer-profile-actions">

        ${
          lead.phone
            ? `
              <a
                href="${whatsappLink(lead.phone)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-primary"
              >
                <i class="fa-brands fa-whatsapp"></i>
                WhatsApp
              </a>
            `
            : ""
        }


        <button
          type="button"
          class="btn btn-secondary"
          onclick="editLeadFromProfile('${escapeHTML(String(lead.id))}')"
        >
          <i class="fa-solid fa-pen"></i>
          Edit
        </button>

      </div>

    </div>


    <!-- ================================================
         INFORMATION GRID
    ================================================= -->

    <div class="customer-profile-grid">


      <!-- CUSTOMER INFORMATION -->
      <div class="profile-card">

        <div class="profile-card-header">

          <div>

            <span class="card-eyebrow">
              CUSTOMER
            </span>

            <h3>
              Customer Information
            </h3>

          </div>

          <i class="fa-solid fa-user"></i>

        </div>


        <div class="profile-info-list">


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-user"></i>
              Customer
            </span>

            <strong>
              ${escapeHTML(
                lead.customer_name || "-"
              )}
            </strong>

          </div>


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-phone"></i>
              Phone
            </span>

            <strong>
              ${
                lead.phone
                  ? `
                    <a
                      href="${whatsappLink(lead.phone)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ${escapeHTML(
                        lead.phone
                      )}
                    </a>
                  `
                  : "-"
              }
            </strong>

          </div>


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-envelope"></i>
              Email
            </span>

            <strong>
              ${escapeHTML(
                lead.email || "-"
              )}
            </strong>

          </div>


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-building"></i>
              Business
            </span>

            <strong>
              ${escapeHTML(
                lead.business || "-"
              )}
            </strong>

          </div>


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-location-dot"></i>
              Location
            </span>

            <strong>
              ${escapeHTML(
                lead.location || "-"
              )}
            </strong>

          </div>


          <div class="profile-info-row">

            <span>
              <i class="fa-solid fa-user-tie"></i>
              Sales
            </span>

            <strong>
              ${escapeHTML(
                salesName || "-"
              )}
            </strong>

          </div>


        </div>

      </div>


      <!-- SALES PIPELINE -->
      <div class="profile-card">

        <div class="profile-card-header">

          <div>

            <span class="card-eyebrow">
              SALES PROCESS
            </span>

            <h3>
              Sales Timeline
            </h3>

          </div>

          <i class="fa-solid fa-chart-line"></i>

        </div>


        <div class="profile-timeline">


          ${profileTimelineItem(
            "Follow Up",
            lead.follow_up_date,
            "fa-phone",
            !!lead.follow_up_date
          )}


          ${profileTimelineItem(
            "Appointment",
            lead.appointment,
            "fa-calendar-check",
            !!lead.appointment
          )}


          ${profileTimelineItem(
            "Site Survey",
            lead.site_survey,
            "fa-location-dot",
            !!lead.site_survey
          )}


          ${profileTimelineItem(
            "Quotation",
            lead.quotation,
            "fa-file-invoice-dollar",
            !!lead.quotation
          )}


          ${profileTimelineItem(
            "SPK",
            lead.spk,
            "fa-file-signature",
            !!lead.spk
          )}


          ${profileTimelineItem(
            "Closing",
            lead.closing,
            "fa-circle-check",
            !!lead.closing
          )}


        </div>

      </div>


    </div>


    <!-- ================================================
         NOTES
    ================================================= -->

    <div class="profile-card profile-notes-card">

      <div class="profile-card-header">

        <div>

          <span class="card-eyebrow">
            NOTES
          </span>

          <h3>
            Customer Notes
          </h3>

        </div>

        <i class="fa-solid fa-note-sticky"></i>

      </div>


      <div class="profile-notes">

        ${
          lead.notes
            ? `
              <p>
                ${escapeHTML(
                  lead.notes
                ).replace(
                  /\n/g,
                  "<br>"
                )}
              </p>
            `
            : `
              <div class="empty-inline">
                Belum ada catatan customer.
              </div>
            `
        }

      </div>

    </div>


    <!-- ================================================
         SYSTEM INFORMATION
    ================================================= -->

    <div class="profile-system-info">

      <span>
        Created:
        ${lead.created_at
          ? formatDate(lead.created_at)
          : "-"
        }
      </span>

      ${
        lead.updated_at
          ? `
            <span>
              Updated:
              ${formatDate(
                lead.updated_at
              )}
            </span>
          `
          : ""
      }

    </div>

  `;

}


/* =========================================================
   PROFILE TIMELINE ITEM
   ========================================================= */

function profileTimelineItem(
  label,
  date,
  icon,
  completed
) {

  return `

    <div
      class="profile-timeline-item ${
        completed
          ? "completed"
          : ""
      }"
    >

      <div class="timeline-icon">

        <i class="fa-solid ${icon}"></i>

      </div>


      <div class="timeline-content">

        <strong>
          ${escapeHTML(label)}
        </strong>

        <span>
          ${
            date
              ? formatDate(date)
              : "Belum ada"
          }
        </span>

      </div>


      <div class="timeline-status">

        ${
          completed
            ? `
              <i class="fa-solid fa-circle-check"></i>
            `
            : `
              <i class="fa-regular fa-circle"></i>
            `
        }

      </div>

    </div>

  `;

}


/* =========================================================
   SALES NAME
   ========================================================= */

function getSalesNameForProfile(
  salesId
) {

  if (!salesId) {

    if (
      currentProfile?.role !== "Admin"
    ) {
      return currentProfile?.name || "-";
    }

    return "-";

  }


  const sales =
    (salesUsersData || []).find(
      item =>
        String(item.id) ===
        String(salesId)
    );


  if (sales?.name) {
    return sales.name;
  }


  if (
    currentProfile &&
    String(currentProfile.id) ===
      String(salesId)
  ) {

    return (
      currentProfile.name ||
      "-"
    );

  }


  return "-";

}


/* =========================================================
   EDIT FROM PROFILE
   ========================================================= */

function editLeadFromProfile(
  id
) {

  if (!id) return;


  /*
   * Customer profile berada di halaman berbeda.
   * Kita kembali ke Leads dan membuka modal edit.
   */

  window.location.href =
    "leads.html?edit=" +
    encodeURIComponent(id);

}
