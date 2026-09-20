// ========================================
// CRM FSI - SALES MANAGEMENT
// ========================================


// ========================================
// LOAD SALES USERS
// ========================================

async function loadSalesUsers() {

  if (
    currentProfile?.role !== "Admin" ||
    !$("salesTableBody")
  ) {
    return;
  }


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("sales_users")
      .select(
        "id,name,username,role,status,created_at"
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


    if (error) {
      throw error;
    }


    salesUsersData =
      data || [];


    const salesOnly =
      salesUsersData.filter(
        (user) =>
          user.role === "Sales"
      );


    const active =
      salesOnly.filter(
        (user) =>
          String(
            user.status || ""
          ).toLowerCase() ===
          "active"
      ).length;


    const totalElement =
      $("totalSalesUsers");

    const activeElement =
      $("activeSalesUsers");

    const inactiveElement =
      $("inactiveSalesUsers");


    if (totalElement) {
      totalElement.textContent =
        salesOnly.length;
    }


    if (activeElement) {
      activeElement.textContent =
        active;
    }


    if (inactiveElement) {
      inactiveElement.textContent =
        salesOnly.length -
        active;
    }


    renderSalesTable();


    if (
      typeof populateSales ===
      "function"
    ) {
      await populateSales();
    }

  } catch (error) {

    console.error(
      "loadSalesUsers:",
      error
    );


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
      $("salesSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const rows =
    salesUsersData

      .filter(
        (user) =>
          user.role === "Sales"
      )

      .filter(
        (user) => {

          const name =
            (
              user.name || ""
            ).toLowerCase();


          const username =
            (
              user.username || ""
            ).toLowerCase();


          return (
            name.includes(search) ||
            username.includes(search)
          );
        }
      );


  if (!rows.length) {

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-state"
        >
          Tidak ada data Sales.
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


          const safeId =
            String(sales.id)
              .replace(/'/g, "\\'");


          return `

            <tr>

              <td>
                ${index + 1}
              </td>


              <td>
                <strong>
                  ${safeText(
                    sales.name
                  )}
                </strong>
              </td>


              <td>
                ${safeText(
                  sales.username
                )}
              </td>


              <td>
                ${safeText(
                  sales.role
                )}
              </td>


              <td>

                <span
                  class="status-badge ${statusClass}"
                >
                  ${safeText(
                    statusText
                  )}
                </span>

              </td>


              <td>
                ${formatDate(
                  sales.created_at
                )}
              </td>


              <td>

                <div
                  class="action-buttons"
                >

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
// SALES PAGE EVENTS
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // SEARCH SALES

    $("salesSearch")?.addEventListener(
      "input",
      debounce(
        () => {
          renderSalesTable();
        },
        300
      )
    );


    // ADD SALES

    $("addSalesBtn")?.addEventListener(
      "click",
      () => {

        if (
          currentProfile?.role !==
          "Admin"
        ) {
          showToast(
            "Access denied.",
            "error"
          );

          return;
        }


        $("salesForm")?.reset();


        if (
          typeof showFormMessage ===
          "function"
        ) {
          showFormMessage(
            "salesFormMessage",
            ""
          );
        }


        if (
          typeof openModal ===
          "function"
        ) {
          openModal(
            "salesModal"
          );
        }

      }
    );


    // CREATE SALES

    $("salesForm")?.addEventListener(
      "submit",
      handleCreateSales
    );

  }
);


// ========================================
// CREATE SALES
// ========================================

async function handleCreateSales(
  event
) {

  event.preventDefault();


  if (
    currentProfile?.role !==
    "Admin"
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
      .trim() || "";


  const username =
    $("salesUsername")
      ?.value
      .trim() || "";


  const password =
    $("salesPassword")
      ?.value || "";


  if (
    !name ||
    !username ||
    !password
  ) {

    showFormMessage(
      "salesFormMessage",
      "Name, username dan password wajib diisi."
    );

    return;
  }


  const saveButton =
    $("saveSalesBtn");


  if (saveButton) {

    setButtonLoading(
      saveButton,
      true,
      "Create Sales"
    );

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.functions.invoke(
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


    if (
      typeof closeModal ===
      "function"
    ) {
      closeModal(
        "salesModal"
      );
    }


    showToast(
      "Sales berhasil dibuat.",
      "success"
    );


    await loadSalesUsers();


    if (
      typeof loadSalesLookup ===
      "function"
    ) {
      await loadSalesLookup();
    }


  } catch (error) {

    console.error(
      "handleCreateSales:",
      error
    );


    showFormMessage(
      "salesFormMessage",
      error.message ||
        "Gagal membuat Sales."
    );

  } finally {

    if (saveButton) {

      setButtonLoading(
        saveButton,
        false,
        "Create Sales"
      );

    }
  }
}


// ========================================
// TOGGLE SALES STATUS
// ========================================

async function toggleSalesStatus(
  id
) {

  if (
    currentProfile?.role !==
    "Admin"
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }


  const sales =
    salesUsersData.find(
      (user) =>
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
    currentStatus ===
    "active"
      ? "Inactive"
      : "Active";


  openConfirm(
    "Ubah Status Sales",

    `Ubah status ${
      sales.name ||
      sales.username
    } menjadi ${nextStatus}?`,

    async () => {

      const {
        error
      } = await supabaseClient
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


      if (
        typeof loadSalesLookup ===
        "function"
      ) {
        await loadSalesLookup();
      }

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

    clearTimeout(timer);


    timer = setTimeout(
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
