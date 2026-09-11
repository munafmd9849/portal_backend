package com.pwioi.portal.security;

import com.pwioi.portal.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    public static PortalPrincipal require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof PortalPrincipal p)) {
            throw ApiException.unauthorized("Authentication required");
        }
        return p;
    }

    public static PortalPrincipal orNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof PortalPrincipal p) {
            return p;
        }
        return null;
    }

    public static void requireRole(String... roles) {
        PortalPrincipal p = require();
        if (!Roles.allowed(p.getRole(), roles)) {
            throw ApiException.forbidden("Forbidden");
        }
    }
}
