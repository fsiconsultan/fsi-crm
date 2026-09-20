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

  /*
    Pasang event terlebih dahulu.
    Ini memastikan tombol Add New Sales
    langsung aktif saat halaman dibuka.
  */
  bindSalesEvents();

  /*
    Setelah event siap,
    baru ambil database Sales.
  */
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

    console.warn(
      "LOAD SALES DITOLAK: User bukan Admin."
    );

    return;
  }


  const tableBody =
    $("salesTableBody");


  if (!tableBody) {

    console.error(
      "ELEMENT salesTableBody TIDAK DITEMUKAN."
    );

    return;
  }


  try {

    console.log(
      "================================"
    );

    console.log(
      "CRM FSI - MEMUAT SALES USERS"
    );

    console.log(
      "================================"
    );


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

      throw new Error(
        error.message ||
        "Gagal membaca tabel sales_users."
      );

    }


    salesUsersData =
      Array.isArray(data)
        ? data
        : [];


    console.log(
      "TOTAL ROW sales_users:",
      salesUsersData.length
    );


    /*
      Hanya role Sales yang
      ditampilkan di Manage Sales.
    */

    const salesOnly =
      salesUsersData.filter(
        user =>
          String(
            user.role || ""
          )
            .trim()
            .toLowerCase() ===
          "sales"
      );


    console.log(
      "TOTAL SALES:",
      salesOnly.length
    );


    /*
      Kalau database terbaca tetapi
      tidak ada role Sales, tampilkan
      isi role di Console untuk diagnosis.
    */

    if (
      salesUsersData.length > 0 &&
      salesOnly.length === 0
    ) {

      console.warn(
        "Data sales_users ada, tetapi tidak ada row dengan role = Sales."
      );

      console.table(
        salesUsersData.map(
          user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            status: user.status
          })
        )
      );

    }


    const activeCount =
      salesOnly.filter(
        user =>
          String(
            user.status || ""
          )
            .trim()
            .toLowerCase() ===
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
      Refresh lookup Sales
      untuk Leads dan halaman lain.
    */

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      try {

        await loadSalesLookup();

      } catch (lookupError) {

        console.warn(
          "LOAD SALES LOOKUP ERROR:",
          lookupError
        );

      }

    }

  } catch (error) {

    console.error(
      "================================"
    );

    console.error(
      "LOAD SALES ERROR:",
      error
    );

    console.error(
      "================================"
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
                error?.message ||
                "Terjadi kesalahan saat membaca sales_users."
              )}
            </span>

          </div>

        </td>
      </tr>
    `;


    showToast(
      error?.message ||
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

    console.error(
      "salesTableBody tidak ditemukan."
    );

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
          )
            .trim()
            .toLowerCase() ===
          "sales"
      )
      .filter(
        user => {

          const name =
            String(
              user.name || ""
            )
              .toLowerCase();


          const username =
            String(
              user.username || ""
            )
              .toLowerCase();


          const email =
            String(
              user.email || ""
            )
              .toLowerCase();


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
            )
              .trim()
              .toLowerCase() ===
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

  console.log(
    "OPEN ADD SALES"
  );


  if (
    currentProfile?.role !== "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  const form =
    $("salesForm");


  const modal =
    $("salesModal");


  if (!modal) {

    console.error(
      "salesModal tidak ditemukan."
    );


    showToast(
      "Modal Add New Sales tidak ditemukan.",
      "error"
    );

    return;
  }


  editingSalesId =
    null;


  form?.reset();


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


  console.log(
    "SALES FORM SUBMIT"
  );


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

      console.log(
        "CREATE SALES:",
        {
          name,
          username
        }
      );


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


      console.log(
        "CREATE SALES RESPONSE:",
        data
      );


      console.log(
        "CREATE SALES ERROR:",
        error
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
        Jangan bergantung pada
        data.sales.id.

        Edge Function utama sudah membuat
        akun dan profile Sales.
      */

      if (
        data &&
        data.success === false
      ) {

        throw new Error(
          data.message ||
          "Gagal membuat Sales."
        );

      }


      /*
        Photo hanya tambahan.
        Kalau Edge Function mengembalikan
        ID Sales, kita coba simpan.
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
      error?.message ||
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
    )
      .trim()
      .toLowerCase();


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
          error?.message ||
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

  /*
    Jangan tandai bound sebelum
    elemen halaman benar-benar ditemukan.
  */

  const addButton =
    $("addSalesBtn");

  const form =
    $("salesForm");

  const searchInput =
    $("salesSearch");

  const photoInput =
    $("salesPhotoUrl");


  console.log(
    "BIND SALES EVENTS:",
    {
      addButton: !!addButton,
      form: !!form,
      searchInput: !!searchInput,
      photoInput: !!photoInput
    }
  );


  /*
    Kalau event sudah dipasang,
    jangan dipasang dua kali.
  */

  if (salesEventsBound) {
    return;
  }


  // ======================================
  // SEARCH
  // ======================================

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      debounce(
        () => {

          renderSalesTable();

        },
        300
      )
    );

  }


  // ======================================
  // ADD SALES
  // ======================================

  if (addButton) {

    addButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        console.log(
          "ADD NEW SALES CLICK"
        );

        openAddSales();

      }
    );

  } else {

    console.error(
      "TOMBOL addSalesBtn TIDAK DITEMUKAN."
    );

  }


  // ======================================
  // SALES FORM
  // ======================================

  if (form) {

    form.addEventListener(
      "submit",
      handleCreateSales
    );

  } else {

    console.error(
      "FORM salesForm TIDAK DITEMUKAN."
    );

  }


  // ======================================
  // PHOTO PREVIEW
  // ======================================

  if (photoInput) {

    photoInput.addEventListener(
      "input",
      event => {

        showSalesPhotoPreview(
          event.target.value.trim()
        );

      }
    );

  }


  salesEventsBound =
    true;

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
