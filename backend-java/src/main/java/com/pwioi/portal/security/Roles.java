package com.pwioi.portal.security;

import java.util.Set;

public final class Roles {
    public static final String STUDENT = "STUDENT";
    public static final String RECRUITER = "RECRUITER";
    public static final String ADMIN = "ADMIN";
    public static final String SUPER_ADMIN = "SUPER_ADMIN";

    public static final String ROLE_STUDENT = "ROLE_STUDENT";
    public static final String ROLE_RECRUITER = "ROLE_RECRUITER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";

    private Roles() {}

    public static boolean isAdmin(String role) {
        return ADMIN.equals(role) || SUPER_ADMIN.equals(role);
    }

    public static boolean allowed(String userRole, String... roles) {
        if (SUPER_ADMIN.equals(userRole)) {
            return true;
        }
        if (userRole == null) {
            return false;
        }
        for (String r : roles) {
            if (userRole.equals(r)) {
                return true;
            }
        }
        return false;
    }

    public static boolean in(String userRole, Set<String> roles) {
        return SUPER_ADMIN.equals(userRole) || (userRole != null && roles.contains(userRole));
    }
}
