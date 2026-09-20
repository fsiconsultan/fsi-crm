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


  // Hanya Admin
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

  if (
    currentProfile?.role !== "Admin"
  ) {
    return;
  }


  if (!$("salesTableBody")) {
    return;
  }


  try {

    console.log(
      "CRM FSI - MEMUAT SALES USERS..."
    );


    /*
      Gunakan select("*") supaya kita tidak
      bergantung pada kolom tertentu seperti
      photo_url yang mungkin belum ada.
    */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("sales_users")
        .select("*")
        .order(
          "name",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "LOAD SALES ERROR:",
        error
      );

      throw error;
    }


    salesUsersData =
      data || [];


    console.log(
      "CRM FSI - SALES DATA:",
      salesUsersData
    );


    /*
      Hanya role Sales yang ditampilkan
      pada Manage Sales.
    */

    const salesOnly =
      salesUsersData.filter(
        user =>
          String(
            user.role || ""
          ).toLowerCase() === "sales"
      );


    const active =
      salesOnly.filter(
        user =>
          String(
            user.status || ""
          ).toLowerCase() === "active"
      ).length;


    const inactive =
      salesOnly.length -
      active;


    // ======================================
    // STATISTICS
    // ======================================

    setText(
      "totalSalesUsers",
      salesOnly.length
    );


    setText(
      "activeSalesUsers",
      active
    );


    setText(
      "inactiveSalesUsers",
      inactive
    );


    // ======================================
    // TABLE
    // ======================================

    renderSalesTable();


    /*
      Refresh lookup Sales untuk Leads.
    */

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      await loadSalesLookup();

    }


  } catch (error) {

    console.error(
      "loadSalesUsers:",
      error
    );


    const tableBody =
      $("salesTableBody");


    if (tableBody) {

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

    }


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
    (
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
          ).toLowerCase() === "sales"
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


          return (
            name.includes(search) ||
            username.includes(search)
          );

        }
      );


  // ======================================
  // EMPTY
  // ======================================

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


  // ======================================
  // TABLE ROWS
  // ======================================

  tableBody.innerHTML =
    rows
      .map(
        (sales, index) => {

          const isActive =
            String(
              sales.status || ""
            ).toLowerCase() === "active";


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


          const email =
            sales.email ||
            "";


          return `
            <tr>


              <!-- NUMBER -->

              <td>

                <span
                  class="sales-row-number"
                >
                  ${index + 1}
                </span>

              </td>


              <!-- SALES -->

              <td>

                <div
                  class="sales-person-cell"
                >

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


                  <div
                    class="sales-person-info"
                  >

                    <strong>
                      ${escapeHTML(
                        sales.name ||
                        "-"
                      )}
                    </strong>


                    ${
                      email
                        ? `
                          <span>
                            ${escapeHTML(
                              email
                            )}
                          </span>
                        `
                        : ""
                    }

                  </div>

                </div>

              </td>


              <!-- USERNAME -->

              <td>

                <span
                  class="sales-username"
                >
                  ${escapeHTML(
                    sales.username ||
                    "-"
                  )}
                </span>

              </td>


              <!-- ROLE -->

              <td>

                <span
                  class="sales-role"
                >
                  ${escapeHTML(
                    sales.role ||
                    "Sales"
                  )}
                </span>

              </td>


              <!-- STATUS -->

              <td>

                <span
                  class="status-badge ${statusClass}"
                >

                  <i
                    class="fa-solid fa-circle"
                  ></i>

                  ${escapeHTML(
                    statusText
                  )}

                </span>

              </td>


              <!-- CREATED -->

              <td>

                <span
                  class="sales-created"
                >
                  ${formatDate(
                    sales.created_at
                  )}
                </span>

              </td>


              <!-- ACTION -->

              <td>

                <div
                  class="action-buttons"
                >

                  <button
                    type="button"
                    class="icon-btn sales-edit-btn"
                    onclick="openEditSales('${safeId}')"
                    title="Edit Sales"
                  >

                    <i
                      class="fa-regular fa-pen-to-square"
                    ></i>

                  </button>


                  <button
                    type="button"
                    class="icon-btn"
                    onclick="toggleSalesStatus('${safeId}')"
                    title="Toggle status"
                  >

                    <i
                      class="fa-solid fa-power-off"
                    ></i>

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

function getSalesPhotoUrl(sales) {

  /*
    Kalau photo_url memang tersedia
    di database, gunakan.
  */

  if (
    sales &&
    sales.photo_url
  ) {

    return sales.photo_url;

  }


  /*
    Fallback Rist.
    Tidak mempengaruhi database.
  */

  const name =
    String(
      sales?.name || ""
    )
      .trim()
      .toLowerCase();


  if (
    name === "rist"
  ) {

    return "https://yoyszukutqwoxxdolzcg.supabase.co/storage/v1/object/public/sales-avatar/rist.jpeg";

  }


  return "";

}


// ========================================
// INITIALS
// ========================================

function getSalesInitials(name) {

  if (!name) {
    return "SA";
  }


  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (
    parts.length === 1
  ) {

    return parts[0]
      .substring(
        0,
        2
      )
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
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

function openEditSales(id) {

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

    preview.innerHTML = `
      <i class="fa-solid fa-user"></i>
    `;


    preview.classList.remove(
      "has-image"
    );


    return;
  }


  preview.innerHTML = `
    <img
      src="${escapeHTML(url)}"
      alt="Sales photo"
      onerror="
        this.parentElement.innerHTML='<i class=&quot;fa-solid fa-user&quot;></i>';
        this.parentElement.classList.remove('has-image');
      "
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
    null;


  const status =
    $("salesStatus")
      ?.value ||
    "Active";


  // ======================================
  // VALIDATION
  // ======================================

  if (
    !name ||
    !username
  ) {

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
    // CREATE
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
        Simpan photo_url hanya jika
        Edge Function mengembalikan ID
        Sales baru.
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
            photoError
          );

        }

      }


      showToast(
        "Sales berhasil dibuat.",
        "success"
      );

    }


    // ====================================
    // UPDATE
    // ====================================

    else {

      /*
        Update field dasar terlebih dahulu.
      */

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
        photo_url dicoba terpisah.
        Kalau kolom belum ada, data utama
        Sales tetap tidak gagal.
      */

      if (photoUrl !== null) {

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
            photoError
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
