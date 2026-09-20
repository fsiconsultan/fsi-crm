// ============================================================
// CRM FSI - AUTHENTICATION
// ============================================================

let authInitialized = false;

// ============================================================
// SALES AVATAR
// ============================================================

const SALES_AVATAR_MAP = {
    // Rist
    "df7a9ddb-23e3-40ce-a53e-8befeaba71c5":
        "https://yoyszukutqwoxxdolzcg.supabase.co/storage/v1/object/public/sales-avatar/rist.jpeg"
};

// ============================================================
// DOM HELPER
// ============================================================

function authGet(id) {
    return document.getElementById(id);
}

// ============================================================
// GET AVATAR
// ============================================================

function getSalesAvatar(profile) {
    if (!profile) return "";

    // Jika suatu saat tabel sales_users mempunyai avatar_url
    if (profile.avatar_url) {
        return profile.avatar_url;
    }

    // Jika menggunakan photo_url
    if (profile.photo_url) {
        return profile.photo_url;
    }

    // Mapping berdasarkan auth_user-id
    const authId =
        profile["auth_user-id"] ||
        profile.auth_user_id ||
        profile.id;

    return SALES_AVATAR_MAP[authId] || "";
}

// ============================================================
// GET DISPLAY NAME
// ============================================================

function getProfileName(profile) {
    if (!profile) return "User";

    return (
        profile.name ||
        profile.full_name ||
        profile.sales_name ||
        profile.username ||
        profile.display_name ||
        profile.email ||
        "User"
    );
}

// ============================================================
// GET ROLE
// ============================================================

function getProfileRole(profile) {
    if (!profile) return "User";

    const role = profile.role || "";

    if (String(role).toLowerCase() === "admin") {
        return "Admin";
    }

    if (String(role).toLowerCase() === "sales") {
        return "Sales";
    }

    return role || "User";
}

// ============================================================
// GET INITIAL
// ============================================================

function getUserInitial(name) {
    if (!name) return "F";

    const cleanName = String(name).trim();

    if (!cleanName) return "F";

    const words = cleanName.split(/\s+/);

    if (words.length >= 2) {
        return (
            words[0].charAt(0) +
            words[1].charAt(0)
        ).toUpperCase();
    }

    return cleanName.charAt(0).toUpperCase();
}

// ============================================================
// UPDATE HEADER USER
// ============================================================

function updateUserHeader(profile) {
    const name = getProfileName(profile);
    const role = getProfileRole(profile);
    const avatar = getSalesAvatar(profile);
    const initial = getUserInitial(name);

    const userInfo = authGet("userInfo");
    const userAvatarInitial = authGet("userAvatarInitial");

    // --------------------------------------------------------
    // USER INFO
    // --------------------------------------------------------

    if (userInfo) {
        userInfo.innerHTML = `
            <strong>${escapeAuthHtml(name)}</strong>
            <small>${escapeAuthHtml(role)}</small>
        `;
    }

    // --------------------------------------------------------
    // AVATAR
    // --------------------------------------------------------

    if (userAvatarInitial) {
        if (avatar) {
            userAvatarInitial.innerHTML = `
                <img
                    src="${avatar}"
                    alt="${escapeAuthHtml(name)}"
                    class="user-avatar-image"
                    onerror="this.style.display='none'; this.parentElement.classList.add('avatar-fallback');"
                >
            `;

            userAvatarInitial.classList.add("has-photo");
            userAvatarInitial.setAttribute("title", name);
        } else {
            userAvatarInitial.textContent = initial;
            userAvatarInitial.classList.remove("has-photo");
        }
    }

    // --------------------------------------------------------
    // PROFILE MODAL DATA
    // --------------------------------------------------------

    const profileName = authGet("profileName");
    const profileRole = authGet("profileRole");
    const profileEmail = authGet("profileEmail");
    const profileAvatar = authGet("profileAvatar");

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileRole) {
        profileRole.textContent = role;
    }

    if (profileEmail) {
        profileEmail.textContent =
            profile.email || currentUser?.email || "-";
    }

    if (profileAvatar) {
        if (avatar) {
            profileAvatar.src = avatar;
            profileAvatar.style.display = "block";
        } else {
            profileAvatar.style.display = "none";
        }
    }
}

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeAuthHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// GET CURRENT USER
// ============================================================

async function getCurrentAuthUser() {
    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error) {
            console.error("getUser error:", error);
            return null;
        }

        return data?.user || null;

    } catch (error) {
        console.error("getCurrentAuthUser error:", error);
        return null;
    }
}

// ============================================================
// LOAD PROFILE
// ============================================================

async function loadCurrentProfile(user) {
    if (!user) {
        currentProfile = null;
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from("sales_users")
            .select("*")
            .eq("auth_user-id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Profile load error:", error);

            // Fallback minimal profile
            currentProfile = {
                "auth_user-id": user.id,
                email: user.email || "",
                role: "Sales",
                name: user.email || "User"
            };

            return currentProfile;
        }

        if (!data) {
            console.warn("Profile tidak ditemukan di sales_users.");

            currentProfile = {
                "auth_user-id": user.id,
                email: user.email || "",
                role: "Sales",
                name: user.email || "User"
            };

            return currentProfile;
        }

        currentProfile = {
            ...data,
            email: data.email || user.email || ""
        };

        return currentProfile;

    } catch (error) {
        console.error("loadCurrentProfile error:", error);

        currentProfile = {
            "auth_user-id": user.id,
            email: user.email || "",
            role: "Sales",
            name: user.email || "User"
        };

        return currentProfile;
    }
}

// ============================================================
// INITIALIZE AUTH
// ============================================================

async function initializeAuth() {
    if (authInitialized) {
        return {
            user: currentUser,
            profile: currentProfile
        };
    }

    try {
        const user = await getCurrentAuthUser();

        if (!user) {
            currentUser = null;
            currentProfile = null;

            // Jangan redirect jika sudah di login
            const currentPath =
                window.location.pathname.toLowerCase();

            if (!currentPath.endsWith("/login.html") &&
                !currentPath.endsWith("login.html")) {

                window.location.href = "login.html";
            }

            return null;
        }

        currentUser = user;

        const profile = await loadCurrentProfile(user);

        currentProfile = profile;

        updateUserHeader(profile);

        authInitialized = true;

        return {
            user: currentUser,
            profile: currentProfile
        };

    } catch (error) {
        console.error("initializeAuth error:", error);
        return null;
    }
}

// ============================================================
// LOGOUT
// ============================================================

async function logoutUser() {
    try {
        if (typeof showGlobalLoading === "function") {
            showGlobalLoading(true, "Logging out...");
        }

        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);

            if (typeof showToast === "function") {
                showToast(
                    "Logout gagal",
                    error.message || "Tidak dapat logout.",
                    "error"
                );
            }

            return;
        }

        currentUser = null;
        currentProfile = null;
        authInitialized = false;

        window.location.href = "login.html";

    } catch (error) {
        console.error("logoutUser error:", error);

        window.location.href = "login.html";
    }
}

// ============================================================
// ALIAS
// ============================================================

window.logoutUser = logoutUser;
window.handleLogout = logoutUser;
window.signOutUser = logoutUser;

// ============================================================
// AUTH STATE CHANGE
// ============================================================

function listenAuthState() {
    if (!supabaseClient?.auth) return;

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            if (event === "SIGNED_OUT") {
                currentUser = null;
                currentProfile = null;

                const currentPath =
                    window.location.pathname.toLowerCase();

                if (!currentPath.includes("login.html")) {
                    window.location.href = "login.html";
                }
            }

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {
                currentUser = session.user;

                const profile =
                    await loadCurrentProfile(session.user);

                currentProfile = profile;

                updateUserHeader(profile);
            }
        }
    );
}

// ============================================================
// AUTO INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    const currentPath =
        window.location.pathname.toLowerCase();

    // Halaman login tidak perlu profile header
    if (currentPath.includes("login.html")) {
        return;
    }

    await initializeAuth();

    listenAuthState();
});
