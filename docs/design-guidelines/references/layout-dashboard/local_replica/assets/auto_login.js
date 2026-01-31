(function() {
    console.log("🔥 AUTO-LOGIN V5: FORCE AUTH & BLOCK REDIRECTS 🔥");

    // --- 1. SERVICE WORKER KILLER (Priority High) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log("💀 Service Worker Killed:", registration);
            }
        });
    }

    // --- 2. PRESET CREDENTIALS & TOKENS ---
    const PRESET_EMAIL = "a0405142777@gmail.com";
    const PRESET_PASSWORD = "12345678";
    
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

    // --- 3. STORAGE ENFORCER (Run constantly) ---
    function forceAuthStorage() {
        try {
            // Standard JWT locations
            localStorage.setItem('auth_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(fakeUser));
            localStorage.setItem('current_user', JSON.stringify(fakeUser));
            localStorage.setItem('redux_state', JSON.stringify({
                auth: { isAuthenticated: true, user: fakeUser, token: token }
            }));
            
            // Cookies
            document.cookie = `auth_token=${token}; path=/; max-age=31536000`;
            document.cookie = `token=${token}; path=/; max-age=31536000`;
            document.cookie = `user=${encodeURIComponent(JSON.stringify(fakeUser))}; path=/; max-age=31536000`;
        } catch (e) { console.error(e); }
    }
    forceAuthStorage();
    setInterval(forceAuthStorage, 50); // Fight back aggressively

    // --- 4. NAVIGATION BLOCKER ---
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;

    function isLoginUrl(url) {
        if (!url) return false;
        const s = url.toString().toLowerCase();
        return (
            s.includes('/login') ||
            s.includes('/auth') ||
            s.includes('signin') ||
            s.includes('oauth') ||
            s.includes('sso')
        );
    }

    window.location.assign = function(url) {
        if (isLoginUrl(url)) {
            console.warn("🚫 BLOCKED REDIRECT TO:", url);
            return;
        }
        return originalAssign.apply(window.location, arguments);
    };

    window.location.replace = function(url) {
        if (isLoginUrl(url)) {
            console.warn("🚫 BLOCKED REPLACE TO:", url);
            return;
        }
        return originalReplace.apply(window.location, arguments);
    };

    const originalPush = history.pushState;
    const originalRep = history.replaceState;
    
    history.pushState = function(state, title, url) {
        if (isLoginUrl(url)) {
             console.warn("🚫 BLOCKED PUSHSTATE TO:", url);
             return;
        }
        return originalPush.apply(history, arguments);
    };

    history.replaceState = function(state, title, url) {
        if (isLoginUrl(url)) {
             console.warn("🚫 BLOCKED REPLACESTATE TO:", url);
             return;
        }
        return originalRep.apply(history, arguments);
    };

    // --- 5. NETWORK INTERCEPTOR (Fetch & XHR) ---
    // Override Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = input.toString().toLowerCase();
        
        // Mock Auth Checks
        if (url.includes('/users/me') || url.includes('/auth/check') || url.includes('/api/v1/user') || url.includes('profile')) {
            console.log("✅ MOCKING AUTH CHECK:", url);
            return new Response(JSON.stringify(fakeUser), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.includes('logout') || url.includes('signout')) {
            console.log("🚫 BLOCKED LOGOUT CALL:", url);
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        try {
            const response = await originalFetch.apply(this, arguments);
            if (response.status === 401 || response.status === 403) {
                console.warn("⚠️ INTERCEPTED 401/403 FROM:", url, "RETURNING FAKE SUCCESS");
                // Try to guess the expected response structure based on URL
                let body = { success: true };
                if (url.includes('user')) body = fakeUser;
                
                return new Response(JSON.stringify(body), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return response;
        } catch (e) {
            // If network fails (e.g. blocked domain), mock success
            console.error("Fetch failed (likely blocked), mocking success:", url, e);
            return new Response(JSON.stringify({ success: true, data: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    };

    // Override XHR
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url.toString().toLowerCase();
        return originalXhrOpen.apply(this, arguments);
    };
    
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        const url = this._url || "";
        
        // Intercept Auth/Logout calls
        if (url.includes('/users/me') || url.includes('/auth/check') || url.includes('logout')) {
            console.log("🚫 INTERCEPTED XHR:", url);
            Object.defineProperty(this, 'readyState', { value: 4 });
            Object.defineProperty(this, 'status', { value: 200 });
            Object.defineProperty(this, 'responseText', { value: JSON.stringify(fakeUser) });
            this.dispatchEvent(new Event('readystatechange'));
            this.dispatchEvent(new Event('load'));
            return;
        }

        // Add listener for 401/403 on real requests
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 4 && (this.status === 401 || this.status === 403)) {
                console.warn("⚠️ INTERCEPTED XHR 401/403, PATCHING RESPONSE");
                Object.defineProperty(this, 'status', { value: 200 });
                Object.defineProperty(this, 'responseText', { value: JSON.stringify({ success: true }) });
            }
        });

        return originalXhrSend.apply(this, arguments);
    };

    // --- 6. LOGIN UI HOOKS (Buttons + Forms) ---
    const DASHBOARD_URL = "/owners/dashboard/index.html";

    function safeRedirectToDashboard(source) {
        console.log("✅ FORCE LOGIN & REDIRECT from:", source);
        try {
            forceAuthStorage();
        } catch (e) {
            console.error("forceAuthStorage error:", e);
        }
        try {
            window.location.href = DASHBOARD_URL;
        } catch (e) {
            console.error("redirect error:", e);
        }
    }

    function isSocialOrEmailButton(el) {
        if (!el) return false;

        const text = (el.innerText || el.textContent || "").toLowerCase();
        const aria = (el.getAttribute && el.getAttribute("aria-label")) ? el.getAttribute("aria-label").toLowerCase() : "";
        const dataProvider = (el.dataset && el.dataset.provider) ? el.dataset.provider.toLowerCase() : "";

        const combined = `${text} ${aria} ${dataProvider}`;

        return (
            combined.includes("google") ||
            combined.includes("facebook") ||
            combined.includes("apple") ||
            combined.includes("email") ||
            combined.includes("continue with") ||
            combined.includes("sign in") ||
            combined.includes("log in")
        );
    }

    function attachButtonInterceptors(root) {
        const candidates = root.querySelectorAll('button, a, [role="button"]');
        candidates.forEach(btn => {
            if (!btn || btn.__autoLoginHooked) return;
            if (!isSocialOrEmailButton(btn)) return;

            btn.__autoLoginHooked = true;

            btn.addEventListener("click", function (e) {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                console.log("🎯 Intercepted login button:", (btn.innerText || btn.textContent || "").trim());
                safeRedirectToDashboard("button-click");
            }, true);
        });
    }

    function attachFormInterceptors(root) {
        const forms = root.querySelectorAll("form");
        forms.forEach(form => {
            if (form.__autoLoginHooked) return;

            const action = (form.getAttribute("action") || "").toLowerCase();
            const hasEmail = form.querySelector('input[type="email"], input[name="email"], input[name="username"]');
            const hasPassword = form.querySelector('input[type="password"], input[name="password"]');

            const looksLikeLoginForm =
                hasEmail && hasPassword ||
                action.includes("login") ||
                action.includes("signin") ||
                action.includes("auth");

            if (!looksLikeLoginForm) return;

            form.__autoLoginHooked = true;

            form.addEventListener("submit", function (e) {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                console.log("🎯 Intercepted login form submit");
                safeRedirectToDashboard("form-submit");
            }, true);
        });
    }

    function hookLoginUI() {
        const root = document;
        attachButtonInterceptors(root);
        attachFormInterceptors(root);
    }

    // Try on DOM ready, and periodically afterwards in case SPA renders late
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hookLoginUI);
    } else {
        hookLoginUI();
    }

    setInterval(hookLoginUI, 1000);

    console.log("✅ AUTO-LOGIN V6 ACTIVATED");
})();
