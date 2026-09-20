```javascript
// ================================
// SALES MANAGEMENT
// ================================

async function loadSalesLookup() {
    try {
        const { data, error } = await supabaseClient
            .from("sales_users")
            .select("id, name, username, role, status, created_at")
            .order("name", { ascending: true });

        if (error) {
            console.error("Load sales lookup error:", error);
            return;
        }

        salesUsersData = data || [];
        populateSalesDropdowns();
    } catch (error) {
        console.error("loadSalesLookup error:", error);
    }
}

function populateSalesDropdowns() {
    const salesFilter = document.getElementById("salesFilter");
    if (salesFilter) {
        const currentValue = salesFilter.value;
        salesFilter.innerHTML = "";

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Sales";
        salesFilter.appendChild(allOption);

        salesUsersData
            .filter(sales => sales.role === "Sales")
            .forEach(sales => {
                const option = document.createElement("option");
                option.value = sales.id;
                option.textContent = sales.name || sales.username || "Sales";
                salesFilter.appendChild(option);
            });

        if (salesUsersData.some(sales => String(sales.id) === String(currentValue))) {
            salesFilter.value = currentValue;
        } else {
            salesFilter.value = "";
        }
    }

    const salesDropdownMenu = document.getElementById("salesDropdownMenu");
    if (salesDropdownMenu) {
        salesDropdownMenu.innerHTML = "";

        const allSalesButton = document.createElement("button");
        allSalesButton.type = "button";
        allSalesButton.className = "nav-dropdown-item";
        allSalesButton.dataset.salesId = "";
        allSalesButton.textContent = "All Sales";
        allSalesButton.onclick = function(event) {
            event.stopPropagation();
            if (typeof selectSalesFilter === "function") {
                selectSalesFilter("", "All Sales");
            }
        };
        salesDropdownMenu.appendChild(allSalesButton);

        salesUsersData
            .filter(sales => sales.role === "Sales")
            .forEach(sales => {
                const salesButton = document.createElement("button");
                salesButton.type = "button";
                salesButton.className = "nav-dropdown-item";
                salesButton.dataset.salesId = sales.id;
                salesButton.textContent = sales.name || sales.username || "Sales";
                salesButton.onclick = function(event) {
                    event.stopPropagation();
                    if (typeof selectSalesFilter === "function") {
                        selectSalesFilter(sales.id, sales.name || sales.username || "Sales");
                    }
                };
                salesDropdownMenu.appendChild(salesButton);
            });
    }

    const leadSalesAssign = document.getElementById("leadSalesAssign");
    if (leadSalesAssign) {
        const currentValue = leadSalesAssign.value;
        leadSalesAssign.innerHTML = "";

        const selectOption = document.createElement("option");
        selectOption.value = "";
        selectOption.textContent = "Select Sales";
        leadSalesAssign.appendChild(selectOption);

        salesUsersData
            .filter(sales => sales.role === "Sales")
            .forEach(sales => {
                const option = document.createElement("option");
                option.value = sales.id;
                option.textContent = sales.name || sales.username || "Sales";
                leadSalesAssign.appendChild(option);
            });

        if (salesUsersData.some(sales => String(sales.id) === String(currentValue))) {
            leadSalesAssign.value = currentValue;
        }
    }
    setupSalesAssignmentAccess();
}

function getSalesName(id) {
    if (!id) return "-";
    const sales = salesUsersData.find(user => String(user.id) === String(id));
    if (!sales) return "-";
    return sales.name || sales.username || "-";
}

async function loadSalesUsers() {
    if (!currentProfile || currentProfile.role !== "Admin") return;

    try {
        const { data, error } = await supabaseClient
            .from("sales_users")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            alert(error.message);
            return;
        }

        salesUsersData = data || [];
        salesUsersData.sort((a, b) =>
            String(a.name || a.username || "").localeCompare(
                String(b.name || b.username || ""),
                undefined,
                { sensitivity: "base" }
            )
        );

        renderSalesUsers(salesUsersData);
        populateSalesDropdowns();
    } catch (error) {
        console.error(error);
    }
}

function renderSalesUsers(data) {
    const table = document.getElementById("salesTable");
    if (!table) return;

    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    No sales found
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(sales => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHTML(getValue(sales.name))}</td>
            <td>${escapeHTML(getValue(sales.username))}</td>
            <td>${escapeHTML(getValue(sales.role))}</td>
            <td>
                <span class="status-badge ${sales.status === "Active" ? "status-active" : "status-inactive"}">
                    ${escapeHTML(getValue(sales.status))}
                </span>
            </td>
            <td>${sales.created_at ? formatDateTime(sales.created_at) : "-"}</td>
            <td>
                <button class="secondary-btn small-btn" onclick="toggleSalesStatus('${sales.id}', '${sales.status}')">
                    ${sales.status === "Active" ? "Deactivate" : "Activate"}
                </button>
            </td>
        `;
        table.appendChild(tr);
    });
}

function openSalesModal() {
    const modal = document.getElementById("salesModal");
    if (!modal) {
        alert("Sales modal not found.");
        return;
    }
    clearSalesForm();
    modal.classList.add("show");
    modal.style.display = "flex";
}

function closeSalesModal() {
    const modal = document.getElementById("salesModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.style.display = "none";
}

function clearSalesForm() {
    setValue("salesName", "");
    setValue("salesUsername", "");
    setValue("salesPassword", "");
}

async function createSales() {
    const name = document.getElementById("salesName").value.trim();
    const username = document.getElementById("salesUsername").value.trim();
    const password = document.getElementById("salesPassword").value;

    if (!name || !username || !password) {
        alert("Name, username and password are required.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    if (!currentProfile || currentProfile.role !== "Admin") {
        alert("Only Admin can create Sales accounts.");
        return;
    }

    const confirmCreate = confirm(`Create Sales account "${name}" with username "${username}"?`);
    if (!confirmCreate) return;

    const createButton = document.querySelector("#salesModal .primary-btn");

    try {
        if (createButton) {
            createButton.disabled = true;
            createButton.textContent = "CREATING...";
        }

        const { data, error } = await supabaseClient.functions.invoke("create-sales", {
            body: { name, username, password }
        });

        if (error) {
            alert("Failed to create Sales: \n\n" + error.message);
            return;
        }

        if (data && data.error) {
            alert(data.error + (data.detail ? "\n\n" + data.detail : ""));
            return;
        }

        alert(`Sales created successfully!\n\nName: ${name}\nUsername: ${username}`);
        clearSalesForm();
        closeSalesModal();
        await loadSalesUsers();
        await loadSalesLookup();
        await loadLeads(currentPage);
    } catch (error) {
        alert("An error occurred while creating Sales: \n\n" + error.message);
    } finally {
        if (createButton) {
            createButton.disabled = false;
            createButton.textContent = "CREATE SALES";
        }
    }
}

async function toggleSalesStatus(id, currentStatus) {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const confirmChange = confirm(`Change Sales status to ${newStatus}?`);
    if (!confirmChange) return;

    try {
        const { error } = await supabaseClient
            .from("sales_users")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        await loadSalesUsers();
        await loadSalesLookup();
        await loadLeads(currentPage);
    } catch (error) {
        alert(error.message);
    }
}

function applyTopSalesFilter(salesId) {
    const salesFilter = document.getElementById("salesFilter");
    if (salesFilter) {
        salesFilter.value = salesId || "";
    }
    showLeads();
}

function updateSalesDropdownButton(salesName) {
    const button = document.getElementById("salesDropdownBtn");
    if (!button) return;
    const text = button.querySelector("span");
    if (text) {
        text.textContent = salesName || "Sales";
    }
}
```
