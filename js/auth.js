```javascript
// ================================
// AUTHENTICATION & USER PROFILE
// ================================

async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error(error);
            showLogin();
            return;
        }
        if (!session) {
            showLogin();
            return;
        }
        currentUser = session.user;
        await loadProfile();
    } catch (error) {
        console.error("checkSession error:", error);
        showLogin();
    }
}

async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");

    if (!username || !password) {
        message.textContent = "Username and password are required.";
        return;
    }

    message.textContent = "Logging in...";

    try {
        const { data: email, error: emailError } = await supabaseClient.rpc("get_login_email", {
            p_username: username
        });

        if (emailError) {
            console.error(emailError);
            message.textContent = emailError.message;
            return;
        }

        if (!email) {
            message.textContent = "Username not found or inactive.";
            return;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error(error);
            message.textContent = error.message;
            return;
        }

        currentUser = data.user;
        await loadProfile();
    } catch (error) {
        console.error("login error:", error);
        message.textContent = "An error occurred while logging in.";
    }
}

async function loadProfile() {
    if (!currentUser) {
        showLogin();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("sales_users")
            .select("*")
            .eq("auth_user_id", currentUser.id)
            .single();

        if (error) {
            console.error("Profile error:", error);
            alert("User profile not found.");
            await logout();
            return;
        }

        currentProfile = data;
        updateUserInfo();
        setupRoleAccess();
        showApp();
        await loadSalesLookup();
        await loadFilterOptions();
        await loadLeads(1);
        await updateDashboard();
    } catch (error) {
        console.error("loadProfile error:", error);
    }
}

function showLogin() {
    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");
    if (loginPage) loginPage.style.display = "flex";
    if (app) app.style.display = "none";
}

function showApp() {
    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");
    if (loginPage) loginPage.style.display = "none";
    if (app) app.style.display = "flex";
    showDashboard();
}

function updateUserInfo() {
    if (!currentProfile) return;

    const userInfo = document.getElementById("userInfo");
    const currentUserElement = document.getElementById("currentUser");

    if (userInfo) {
        const avatarUrl = currentProfile.avatar_url || "";
        userInfo.innerHTML = `
            ${avatarUrl 
                ? `<img src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(currentProfile.name)}" class="user-avatar">` 
                : ''
            }
            <strong>${escapeHTML(currentProfile.name)}</strong>
            <small>${escapeHTML(currentProfile.role)}</small>
        `;
    }

    if (currentUserElement) {
        currentUserElement.textContent = `${currentProfile.name} (${currentProfile.role})`;
    }
}

function setupRoleAccess() {
    const manageSalesBtn = document.getElementById("manageSalesBtn");
    const mobileManageSalesBtn = document.getElementById("mobileManageSalesBtn");
    const salesFilter = document.getElementById("salesFilter");
    const salesDropdownContainer = document.getElementById("salesDropdownContainer");

    if (!currentProfile) return;

    const isAdmin = currentProfile.role === "Admin";

    if (manageSalesBtn) manageSalesBtn.style.display = isAdmin ? "block" : "none";
    if (mobileManageSalesBtn) mobileManageSalesBtn.style.display = isAdmin ? "block" : "none";
    if (salesDropdownContainer) salesDropdownContainer.style.display = isAdmin ? "block" : "none";
    if (salesFilter) salesFilter.style.display = isAdmin ? "block" : "none";

    setupSalesAssignmentAccess();
}

function setupSalesAssignmentAccess() {
    const field = document.getElementById("leadSalesAssign");
    if (!field || !currentProfile) return;

    if (currentProfile.role === "Admin") {
        field.disabled = false;
        field.style.display = "block";
    } else {
        field.disabled = true;
        field.style.display = "block";
    }
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error(error);
    }
    currentUser = null;
    currentProfile = null;
    leadsData = [];
    salesUsersData = [];
    currentPage = 1;
    totalLeadsCount = 0;
    window.crmCurrentCustomerId = null;
    window.crmCurrentCustomer = null;
    showLogin();
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth event:", event);
    if (session && !currentProfile) {
        currentUser = session.user;
        setTimeout(async () => {
            await loadProfile();
        }, 100);
    }
    if (!session) {
        currentUser = null;
        currentProfile = null;
        window.crmCurrentCustomerId = null;
        window.crmCurrentCustomer = null;
        showLogin();
    }
});
```
