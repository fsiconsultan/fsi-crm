// ========================================
// CRM FSI - SALES MANAGEMENT
// ========================================

let editingSalesId = null;
let salesEventsBound = false;


// ========================================
// INITIALIZE SALES PAGE
// ========================================

async function initializeSalesPage() {

  console.log("================================");
  console.log("CRM FSI - INITIALIZE SALES");
  console.log("================================");


  if (currentProfile?.role !== "Admin") {

    console.warn(
      "Sales Management hanya untuk Admin."
    );

    return;
  }


  bindSalesEvents();


  await loadSalesUsers();


  console.log(
    "CRM FSI - SALES READY"
  );

}


// ========================================
// LOAD SALES USERS
// ========================================

async function loadSalesUsers() {

  if (currentProfile?.role !== "Admin") {
    return;
  }


  const tableBody =
    $("salesTableBody");


  if (!tableBody) {
    return;
  }


  try {

    console.log(
      "CRM FSI - MEMUAT SALES USERS..."
    );


    /*
      Gunakan select("*").
      Ini mengikuti struktur database lama
      dan tidak mengunci query ke kolom
      tambahan seperti photo_url.
    */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("sales_users")
        .select("*")
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    console.log(
      "SALES QUERY DATA:",
      data
    );


    console.log(
      "SALES QUERY ERROR:",
      error
    );


    if (error) {
      throw error;
    }


    salesUsersData =
      data || [];


    /*
      Hanya role Sales yang
      ditampilkan di Manage Sales.
    */

    const salesOnly =
      salesUsersData.filter(
        user =>
          String(
            user.role || ""
          ).toLowerCase() ===
          "sales"
      );


    const activeCount =
      salesOnly.filter(
        user =>
          String(
            user.status || ""
          ).toLowerCase() ===
          "active"
      ).length;


    const inactiveCount =
      salesOnly.length -
      activeCount;


    // ======================================
    // STATISTICS
    // ======================================

    setText(
      "totalSalesUsers",
      salesOnly.length
    );


    setText(
      "activeSalesUsers",
      activeCount
    );


    setText(
      "inactiveSalesUsers",
      inactiveCount
    );


    // ======================================
    // TABLE
    // ======================================

    renderSalesTable();


    /*
      Refresh Sales lookup untuk
      Leads dan halaman lainnya.
    */

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      await loadSalesLookup();

    }


  } catch (error) {

    console.error(
      "LOAD SALES ERROR:",
      error
    );


    tableBody.innerHTML = `
      <tr>

        <td colspan="7">

          <div class="sales-empty">

            <div class="sales-empty-icon">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <strong>
              Gagal memuat data Sales
            </strong>

            <span>
              ${escapeHTML(
                error.message ||
                "Terjadi kesalahan."
              )}
            </span>

          </div>

        </td>

      </tr>
    `;


    showToast(
      error.message ||
      "Gagal memuat data Sales.",
      "error"
    );

  }

}


// ========================================
// RENDER SALES TABLE
// ========================================

function renderSalesTable() {

  const tableBody =
    $("salesTableBody");


  if (!tableBody) {
    return;
  }


  const search =
    String(
      $("salesSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const rows =
    (salesUsersData || [])
      .filter(
        user =>
          String(
            user.role || ""
          ).toLowerCase() ===
          "sales"
      )
      .filter(
        user => {

          const name =
            String(
              user.name || ""
            ).toLowerCase();


          const username =
            String(
              user.username || ""
            ).toLowerCase();


          const email =
            String(
              user.email || ""
            ).toLowerCase();


          return (
            name.includes(search) ||
            username.includes(search) ||
            email.includes(search)
          );

        }
      );


  if (!rows.length) {

    tableBody.innerHTML = `
      <tr>

        <td colspan="7">

          <div class="sales-empty">

            <div class="sales-empty-icon">
              <i class="fa-solid fa-user-slash"></i>
            </div>

            <strong>
              Tidak ada Sales
            </strong>

            <span>
              Belum ada data Sales yang sesuai.
            </span>

          </div>

        </td>

      </tr>
    `;

    return;
  }


  tableBody.innerHTML =
    rows
      .map(
        (sales, index) => {

          const isActive =
            String(
              sales.status || ""
            ).toLowerCase() ===
            "active";


          const statusClass =
            isActive
              ? "status-active"
              : "status-inactive";


          const statusText =
            sales.status ||
            "Inactive";


          const photo =
            getSalesPhotoUrl(
              sales
            );


          const initials =
            getSalesInitials(
              sales.name
            );


          const safeId =
            String(
              sales.id
            )
              .replace(
                /'/g,
                "\\'"
              );


          return `
            <tr>

              <td>

                <span class="sales-row-number">
                  ${index + 1}
                </span>

              </td>


              <td>

                <div class="sales-person-cell">

                  ${
                    photo
                      ? `
                        <img
                          src="${escapeHTML(photo)}"
                          alt="${escapeHTML(
                            sales.name ||
                            "Sales"
                          )}"
                          class="sales-avatar-table"
                          onerror="
                            this.style.display='none';
                            this.nextElementSibling.style.display='flex';
                          "
                        >
                      `
                      : ""
                  }


                  <div
                    class="sales-avatar-fallback"
                    style="${
                      photo
                        ? "display:none;"
                        : "display:flex;"
                    }"
                  >
                    ${escapeHTML(
                      initials
                    )}
                  </div>


                  <div class="sales-person-info">

                    <strong>
                      ${escapeHTML(
                        sales.name ||
                        "-"
                      )}
                    </strong>


                    ${
                      sales.email
                        ? `
                          <span>
                            ${escapeHTML(
                              sales.email
                            )}
                          </span>
                        `
                        : ""
                    }

                  </div>

                </div>

              </td>


              <td>

                <span class="sales-username">
                  ${escapeHTML(
                    sales.username ||
                    "-"
                  )}
                </span>

              </td>


              <td>

                <span class="sales-role">
                  ${escapeHTML(
                    sales.role ||
                    "Sales"
                  )}
                </span>

              </td>


              <td>

                <span
                  class="status-badge ${statusClass}"
                >

                  <i class="fa-solid fa-circle"></i>

                  ${escapeHTML(
                    statusText
                  )}

                </span>

              </td>


              <td>

                <span class="sales-created">
                  ${formatDate(
                    sales.created_at
                  )}
                </span>

              </td>


              <td>

                <div class="action-buttons">

                  <button
                    type="button"
                    class="icon-btn sales-edit-btn"
                    onclick="openEditSales('${safeId}')"
                    title="Edit Sales"
                  >
                    <i class="fa-regular fa-pen-to-square"></i>
                  </button>


                  <button
                    type="button"
                    class="icon-btn"
                    onclick="toggleSalesStatus('${safeId}')"
                    title="Ubah status"
                  >
                    <i class="fa-solid fa-power-off"></i>
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


// ========================================
// SALES PHOTO
// ========================================

function getSalesPhotoUrl(
  sales
) {

  if (
    sales &&
    sales.photo_url
  ) {

    return String(
      sales.photo_url
    );

  }


  /*
    Fallback foto Rist.
    Tidak mengubah database.
  */

  const name =
    String(
      sales?.name || ""
    )
      .trim()
      .toLowerCase();


  if (name === "rist") {

    return "https://yoyszukutqwoxxdolzcg.supabase.co/storage/v1/object/public/sales-avatar/rist.jpeg";

  }


  return "";

}


// ========================================
// INITIALS
// ========================================

function getSalesInitials(
  name
) {

  if (!name) {
    return "SA";
  }


  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (parts.length === 1) {

    return parts[0]
      .substring(0, 2)
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();

}


// ========================================
// ADD SALES
// ========================================

function openAddSales() {

  if (
    currentProfile?.role !== "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  editingSalesId =
    null;


  $("salesForm")?.reset();


  setValue(
    "salesId",
    ""
  );


  setText(
    "salesModalTitle",
    "Add New Sales"
  );


  setText(
    "salesModalSubtitle",
    "Buat akun Sales baru."
  );


  setText(
    "saveSalesText",
    "Create Sales"
  );


  const passwordGroup =
    $("salesPasswordGroup");


  if (passwordGroup) {

    passwordGroup.style.display =
      "block";

  }


  const statusGroup =
    $("salesStatusGroup");


  if (statusGroup) {

    statusGroup.style.display =
      "none";

  }


  setValue(
    "salesStatus",
    "Active"
  );


  showSalesPhotoPreview(
    ""
  );


  showFormMessage(
    "salesFormMessage",
    "",
    ""
  );


  openModal(
    "salesModal"
  );

}


// ========================================
// EDIT SALES
// ========================================

function openEditSales(
  id
) {

  if (
    currentProfile?.role !== "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  const sales =
    (salesUsersData || [])
      .find(
        user =>
          String(user.id) ===
          String(id)
      );


  if (!sales) {

    showToast(
      "Sales tidak ditemukan.",
      "error"
    );

    return;
  }


  editingSalesId =
    sales.id;


  setValue(
    "salesId",
    sales.id
  );


  setValue(
    "salesName",
    sales.name || ""
  );


  setValue(
    "salesUsername",
    sales.username || ""
  );


  setValue(
    "salesPhotoUrl",
    sales.photo_url || ""
  );


  setValue(
    "salesStatus",
    sales.status ||
    "Active"
  );


  setText(
    "salesModalTitle",
    "Edit Sales"
  );


  setText(
    "salesModalSubtitle",
    "Perbarui informasi Sales."
  );


  setText(
    "saveSalesText",
    "Save Changes"
  );


  const passwordGroup =
    $("salesPasswordGroup");


  if (passwordGroup) {

    passwordGroup.style.display =
      "none";

  }


  const statusGroup =
    $("salesStatusGroup");


  if (statusGroup) {

    statusGroup.style.display =
      "block";

  }


  showSalesPhotoPreview(
    sales.photo_url || ""
  );


  showFormMessage(
    "salesFormMessage",
    "",
    ""
  );


  openModal(
    "salesModal"
  );

}


// ========================================
// PHOTO PREVIEW
// ========================================

function showSalesPhotoPreview(
  url
) {

  const preview =
    $("salesPhotoPreview");


  if (!preview) {
    return;
  }


  if (!url) {

    preview.innerHTML =
      `
        <i class="fa-solid fa-user"></i>
      `;


    preview.classList.remove(
      "has-image"
    );


    return;
  }


  preview.innerHTML =
    `
      <img
        src="${escapeHTML(url)}"
        alt="Sales photo"
      >
    `;


  preview.classList.add(
    "has-image"
  );

}


// ========================================
// CREATE / UPDATE SALES
// ========================================

async function handleCreateSales(
  event
) {

  event.preventDefault();


  if (
    currentProfile?.role !== "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  const name =
    $("salesName")
      ?.value
      .trim() ||
    "";


  const username =
    $("salesUsername")
      ?.value
      .trim() ||
    "";


  const password =
    $("salesPassword")
      ?.value ||
    "";


  const photoUrl =
    $("salesPhotoUrl")
      ?.value
      .trim() ||
    "";


  const status =
    $("salesStatus")
      ?.value ||
    "Active";


  // ======================================
  // VALIDATION
  // ======================================

  if (!name || !username) {

    showFormMessage(
      "salesFormMessage",
      "Name dan username wajib diisi.",
      "error"
    );

    return;
  }


  if (
    !editingSalesId &&
    !password
  ) {

    showFormMessage(
      "salesFormMessage",
      "Password wajib diisi untuk Sales baru.",
      "error"
    );

    return;
  }


  if (
    !editingSalesId &&
    password.length < 6
  ) {

    showFormMessage(
      "salesFormMessage",
      "Password minimal 6 karakter.",
      "error"
    );

    return;
  }


  const saveButton =
    $("saveSalesBtn");


  setButtonLoading(
    saveButton,
    true
  );


  try {

    // ====================================
    // CREATE SALES
    // ====================================

    if (!editingSalesId) {

      const {
        data,
        error
      } =
        await supabaseClient
          .functions
          .invoke(
            CRM_CONFIG.salesCreateFunction,
            {
              body: {
                name,
                username,
                password
              }
            }
          );


      if (error) {
        throw error;
      }


      if (data?.error) {

        throw new Error(
          data.error +
          (
            data.detail
              ? ": " +
                data.detail
              : ""
          )
        );

      }


      /*
        Photo hanya dicoba jika
        kolom photo_url memang ada.
        Jika tidak ada, akun Sales
        tetap berhasil dibuat.
      */

      const createdSales =
        data?.sales;


      if (
        createdSales?.id &&
        photoUrl
      ) {

        const {
          error:
            photoError
        } =
          await supabaseClient
            .from("sales_users")
            .update({
              photo_url:
                photoUrl
            })
            .eq(
              "id",
              createdSales.id
            );


        if (photoError) {

          console.warn(
            "Photo URL tidak tersimpan:",
            photoError.message
          );

        }

      }


      showToast(
        "Sales berhasil dibuat.",
        "success"
      );

    }

    // ====================================
    // UPDATE SALES
    // ====================================

    else {

      const {
        error
      } =
        await supabaseClient
          .from("sales_users")
          .update({
            name,
            username,
            status
          })
          .eq(
            "id",
            editingSalesId
          );


      if (error) {
        throw error;
      }


      /*
        Photo bersifat tambahan.
        Jika kolom photo_url belum ada,
        update utama tetap berhasil.
      */

      if (photoUrl) {

        const {
          error:
            photoError
        } =
          await supabaseClient
            .from("sales_users")
            .update({
              photo_url:
                photoUrl
            })
            .eq(
              "id",
              editingSalesId
            );


        if (photoError) {

          console.warn(
            "Photo URL tidak tersimpan:",
            photoError.message
          );

        }

      }


      showToast(
        "Data Sales berhasil diperbarui.",
        "success"
      );

    }


    closeModal(
      "salesModal"
    );


    editingSalesId =
      null;


    await loadSalesUsers();


  } catch (error) {

    console.error(
      "HANDLE SALES ERROR:",
      error
    );


    showFormMessage(
      "salesFormMessage",
      error.message ||
      "Gagal menyimpan Sales.",
      "error"
    );

  } finally {

    setButtonLoading(
      saveButton,
      false
    );

  }

}


// ========================================
// TOGGLE STATUS
// ========================================

async function toggleSalesStatus(
  id
) {

  if (
    currentProfile?.role !== "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  const sales =
    (salesUsersData || [])
      .find(
        user =>
          String(user.id) ===
          String(id)
      );


  if (!sales) {

    showToast(
      "Sales tidak ditemukan.",
      "error"
    );

    return;
  }


  const currentStatus =
    String(
      sales.status || ""
    ).toLowerCase();


  const nextStatus =
    currentStatus === "active"
      ? "Inactive"
      : "Active";


  openConfirm(
    "Ubah Status Sales",

    `Ubah status ${
      sales.name ||
      sales.username ||
      "Sales"
    } menjadi ${nextStatus}?`,

    async () => {

      try {

        const {
          error
        } =
          await supabaseClient
            .from("sales_users")
            .update({
              status:
                nextStatus
            })
            .eq(
              "id",
              id
            );


        if (error) {
          throw error;
        }


        showToast(
          "Status Sales diperbarui.",
          "success"
        );


        await loadSalesUsers();

      } catch (error) {

        console.error(
          "TOGGLE SALES STATUS ERROR:",
          error
        );


        showToast(
          error.message ||
          "Gagal mengubah status Sales.",
          "error"
        );

      }

    }
  );

}


// ========================================
// EVENTS
// ========================================

function bindSalesEvents() {

  if (salesEventsBound) {
    return;
  }


  salesEventsBound =
    true;


  // ======================================
  // SEARCH
  // ======================================

  $("salesSearch")
    ?.addEventListener(
      "input",
      debounce(
        () => {
          renderSalesTable();
        },
        300
      )
    );


  // ======================================
  // ADD SALES
  // ======================================

  $("addSalesBtn")
    ?.addEventListener(
      "click",
      openAddSales
    );


  // ======================================
  // SALES FORM
  // ======================================

  $("salesForm")
    ?.addEventListener(
      "submit",
      handleCreateSales
    );


  // ======================================
  // PHOTO PREVIEW
  // ======================================

  $("salesPhotoUrl")
    ?.addEventListener(
      "input",
      event => {

        showSalesPhotoPreview(
          event.target.value.trim()
        );

      }
    );

}


// ========================================
// DEBOUNCE
// ========================================

function debounce(
  callback,
  delay = 300
) {

  let timer;


  return function (...args) {

    clearTimeout(
      timer
    );


    timer =
      setTimeout(
        () => {

          callback.apply(
            this,
            args
          );

        },
        delay
      );

  };

}


// ========================================
// PUBLIC FUNCTIONS
// ========================================

window.initializeSalesPage =
  initializeSalesPage;


window.loadSalesUsers =
  loadSalesUsers;


window.renderSalesTable =
  renderSalesTable;


window.openAddSales =
  openAddSales;


window.openEditSales =
  openEditSales;


window.toggleSalesStatus =
  toggleSalesStatus;


window.handleCreateSales =
  handleCreateSales;
