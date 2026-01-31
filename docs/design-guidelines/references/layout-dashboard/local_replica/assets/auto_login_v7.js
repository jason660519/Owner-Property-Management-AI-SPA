(function () {
    console.log("🔥 ULTIMATE BYPASS ACTIVATED 🔥");

    const PRESET_EMAIL = "a0405142777@gmail.com";
    const fakeUser = {
        id: "USER:1045925",
        email: PRESET_EMAIL,
        name: PRESET_EMAIL,
        first_name: "Admin",
        last_name: "User",
        role: "landlord",
        features: ["all"],
        is_verified: true,
        created_at: new Date().toISOString()
    };
    const token = "dummy_token_" + Date.now();

    function forceAuth() {
        try {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(fakeUser));
            localStorage.setItem('current_user', JSON.stringify(fakeUser));
            localStorage.setItem('redux_state', JSON.stringify({ auth: { isAuthenticated: true, user: fakeUser, token: token } }));
            document.cookie = `auth_token=${token}; path=/; max-age=31536000`;
            document.cookie = `token=${token}; path=/; max-age=31536000`;
            document.cookie = `user=${encodeURIComponent(JSON.stringify(fakeUser))}; path=/; max-age=31536000`;
        } catch (e) { }
    }
    forceAuth();
    setInterval(forceAuth, 50);

    // Block redirects to login or logout
    const isAuthUrl = (u) => {
        if (!u) return false;
        const s = String(u).toLowerCase();
        // Specifically check for login/auth paths that we want to avoid
        return (s.includes('/login') || s.includes('/auth') || s.includes('signin') || s.includes('/logout')) && !s.includes('dashboard');
    };

    // If we are currently on a login or logout page, jump to dashboard immediately
    const currentPath = window.location.pathname.toLowerCase();
    if (isAuthUrl(currentPath) || currentPath === '/' || currentPath === '/index.html') {
        console.log("🚀 JUMPING TO DASHBOARD...");
        window.location.href = '/owners/dashboard/index.html';
        return;
    }

    // Intercept navigation to prevent being kicked back to login
    const originalAssign = window.location.assign;
    window.location.assign = function (u) {
        if (isAuthUrl(u)) { console.warn("🚫 BLOCKED REDIRECT TO LOGIN:", u); return; }
        return originalAssign.apply(window.location, arguments);
    };

    const originalReplace = window.location.replace;
    window.location.replace = function (u) {
        if (isAuthUrl(u)) { console.warn("🚫 BLOCKED REPLACE TO LOGIN:", u); return; }
        return originalReplace.apply(window.location, arguments);
    };

    // Mock Fetch for auth checks
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function (input, init) {
            const url = input.toString().toLowerCase();
            if (url.includes('/users/me') || url.includes('/v1/user') || url.includes('auth/check') || url.includes('/api/v1/')) {
                console.log("✅ MOCKING API AUTH SUCCESS:", url);
                return new Response(JSON.stringify(fakeUser), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (url.includes('logout') || url.includes('signout')) {
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            try {
                const response = await originalFetch.apply(this, arguments);
                if (response.status === 401 || response.status === 403) {
                    console.warn("⚠️ PATCHING 401/403 RESPONSE FROM:", url);
                    return new Response(JSON.stringify(fakeUser), { status: 200, headers: { 'Content-Type': 'application/json' } });
                }
                return response;
            } catch (e) {
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
        };
    }
})();
