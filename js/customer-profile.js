// ========================================
// CRM FSI - CUSTOMER PROFILE
// ========================================


// ========================================
// OPEN CUSTOMER PROFILE
// ========================================

function openCustomerProfile(id) {
  if (!id) return;

  window.location.href =
    "customer-profile.html?id=" +
    encodeURIComponent(id);
}

window.crmOpenCustomerProfile =
  openCustomerProfile;


// ========================================
// LOAD CUSTOMER PROFILE
// ========================================

async function loadCustomerProfilePage(id) {
  selectedCustomerId = id;

  const box =
    $("customerProfileContent");

  if (!box) return;

  box.innerHTML = `
    <div class="profile-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      Loading customer...
    </div>
  `;


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("leads")
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


    // Sales hanya boleh melihat customer sendiri
    if (
      currentProfile?.role !== "Admin" &&
      String(data.sales_id) !==
        String(currentProfile.id)
    ) {
      throw new Error(
        "Anda tidak memiliki akses ke customer ini."
      );
    }


    renderCustomerProfile(data);

  } catch (e) {

    console.error(
      "loadCustomerProfilePage:",
      e
    );


    box.innerHTML = `
      <div class="empty-state">

        <i class="fa-solid fa-circle-xmark"></i>

        <h3>
          Gagal memuat customer
        </h3>

        <p>
          ${escapeHTML(
            e.message ||
            "Terjadi kesalahan."
          )}
        </p>

        <br>

        <a
          href="leads.html"
          class="btn btn-secondary"
        >
          Back to Leads
        </a>

      </div>
    `;
  }
}


// ========================================
// RENDER CUSTOMER PROFILE
// ========================================

function renderCustomerProfile(lead) {

  const status =
    normalizeLeadStatus(
      lead.status
    );


  const stages = [

    [
      "Lead",
      true
    ],

    [
      "Flyer Sent",
      [
        "Flyer Sent",
        "Interested",
        "Follow Up",
        "Closing"
      ].includes(status)
    ],

    [
      "Interested",
      [
        "Interested",
        "Follow Up",
        "Closing"
      ].includes(status)
    ],

    [
      "Follow Up",
      [
        "Follow Up",
        "Closing"
      ].includes(status)
    ],

    [
      "Appointment",
      !!lead.appointment
    ],

    [
      "Site Survey",
      !!lead.site_survey
    ],

    [
      "Quotation",
      !!lead.quotation
    ],

    [
      "SPK",
      !!lead.spk
    ],

    [
      "Closing",
      !!lead.closing ||
      status === "Closing"
    ]

  ];


  const customerName =
    lead.customer_name ||
    "Customer";


  const avatar =
    customerName
      .charAt(0)
      .toUpperCase();


  const statusClass =
    status
      .toLowerCase()
      .replace(/\s+/g, "-");


  const salesName =
    getSalesName(
      lead.sales_id
    );


  const phone =
    lead.phone || "";


  const whatsappMessage =
    "Halo " +
    customerName +
    ", saya dari FSI. Mau follow up terkait PLTS.";


  const whatsappUrl =
    phone
      ? whatsappLink(
          phone,
          whatsappMessage
        )
      : "";


  const profileBox =
    $("customerProfileContent");


  if (!profileBox) return;


  profileBox.innerHTML = `

    <!-- BACK BUTTON -->

    <a
      class="back-button"
      href="leads.html"
    >
      <i class="fa-solid fa-arrow-left"></i>
      Back to Leads
    </a>


    <!-- PROFILE HERO -->

    <div class="profile-hero">

      <div class="profile-avatar-xl">
        ${escapeHTML(avatar)}
      </div>


      <div class="profile-main-info">

        <div class="profile-title-row">

          <h2>
            ${safeText(
              customerName
            )}
          </h2>

          <span
            class="status-badge status-${statusClass}"
          >
            ${safeText(status)}
          </span>

        </div>


        <p>
          ${safeText(
            lead.business || "-"
          )}
          ·
          ${safeText(
            lead.location || "-"
          )}
        </p>

      </div>


      <div class="profile-actions">

        <a
          class="btn btn-secondary"
          href="leads.html?edit=${encodeURIComponent(
            lead.id
          )}"
        >
          <i class="fa-solid fa-pen"></i>
          Edit
        </a>


        ${
          phone
            ? `
              <a
                class="btn btn-whatsapp"
                target="_blank"
                rel="noopener"
                href="${whatsappUrl}"
              >
                <i class="fa-brands fa-whatsapp"></i>
                WhatsApp
              </a>
            `
            : ""
        }

      </div>

    </div>


    <!-- PROFILE GRID -->

    <div class="profile-grid">


      <!-- CUSTOMER INFORMATION -->

      <div class="profile-card">

        <h3>
          Customer Information
        </h3>


        <div class="detail-grid">

          <div>
            <label>Phone</label>
            <strong>
              ${safeText(
                lead.phone
              )}
            </strong>
          </div>


          <div>
            <label>Email</label>
            <strong>
              ${safeText(
                lead.email
              )}
            </strong>
          </div>


          <div>
            <label>Business</label>
            <strong>
              ${safeText(
                lead.business
              )}
            </strong>
          </div>


          <div>
            <label>Location</label>
            <strong>
              ${safeText(
                lead.location
              )}
            </strong>
          </div>


          <div>
            <label>Sales</label>
            <strong>
              ${safeText(
                salesName
              )}
            </strong>
          </div>


          <div>
            <label>Created</label>
            <strong>
              ${formatDate(
                lead.created_at
              )}
            </strong>
          </div>

        </div>

      </div>


      <!-- SALES PROGRESS -->

      <div class="profile-card">

        <h3>
          Sales Progress
        </h3>


        <div class="timeline">

          ${stages
            .map(
              (stage, index) => {

                const stageName =
                  stage[0];

                const completed =
                  stage[1];

                const field =
                  stageField(
                    stageName
                  );

                const date =
                  field
                    ? formatDate(
                        lead[field]
                      )
                    : "-";


                return `

                  <div
                    class="timeline-item ${
                      completed
                        ? "done"
                        : ""
                    }"
                  >

                    <span>
                      ${
                        completed
                          ? "✓"
                          : index + 1
                      }
                    </span>


                    <div>

                      <strong>
                        ${escapeHTML(
                          stageName
                        )}
                      </strong>


                      <small>
                        ${date}
                      </small>

                    </div>

                  </div>

                `;
              }
            )
            .join("")}

        </div>

      </div>

    </div>


    <!-- NOTES -->

    <div class="profile-card">

      <h3>
        Notes
      </h3>


      <p class="notes-text">
        ${safeText(
          lead.notes ||
          "Belum ada catatan."
        )}
      </p>

    </div>

  `;
}


// ========================================
// STAGE FIELD
// ========================================

function stageField(stage) {

  const fields = {

    Appointment:
      "appointment",

    "Site Survey":
      "site_survey",

    Quotation:
      "quotation",

    SPK:
      "spk",

    Closing:
      "closing"

  };


  return fields[stage] || null;
}


// ========================================
// NORMALIZE LEAD STATUS
// ========================================

function normalizeLeadStatus(status) {

  if (!status) {
    return "New";
  }


  const value =
    String(status)
      .trim()
      .toLowerCase();


  const statusMap = {

    "new":
      "New",

    "flyer sent":
      "Flyer Sent",

    "interested":
      "Interested",

    "follow up":
      "Follow Up",

    "closing":
      "Closing",

    "not interested":
      "Not Interested"

  };


  return (
    statusMap[value] ||
    status
  );
}


// ========================================
// SAFE TEXT
// ========================================

function safeText(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }


  return escapeHTML(value);
}


// ========================================
// GET SALES NAME
// ========================================

function getSalesName(salesId) {

  if (!salesId) {
    return "-";
  }


  const sales =
    salesUsersData.find(
      (user) =>
        String(user.id) ===
        String(salesId)
    );


  return sales?.name || "-";
}


// ========================================
// WHATSAPP LINK
// ========================================

function whatsappLink(
  phone,
  message
) {

  if (!phone) {
    return "#";
  }


  let cleanPhone =
    String(phone)
      .replace(/\D/g, "");


  // Indonesia
  if (
    cleanPhone.startsWith("0")
  ) {
    cleanPhone =
      "62" +
      cleanPhone.substring(1);
  }


  if (
    cleanPhone.startsWith("8")
  ) {
    cleanPhone =
      "62" +
      cleanPhone;
  }


  return (
    "https://wa.me/" +
    cleanPhone +
    "?text=" +
    encodeURIComponent(
      message || ""
    )
  );
}
