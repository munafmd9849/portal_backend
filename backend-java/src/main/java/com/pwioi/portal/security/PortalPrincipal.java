package com.pwioi.portal.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class PortalPrincipal implements UserDetails {
    private final String id;
    private final String email;
    private final String role;
    private final String status;
    private final int sessionVersion;
    private final String studentId;
    private final String recruiterId;
    private final String adminId;
    private final boolean profileCompleted;

    public PortalPrincipal(String id, String email, String role, String status, int sessionVersion,
                           String studentId, String recruiterId, String adminId, boolean profileCompleted) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.status = status;
        this.sessionVersion = sessionVersion;
        this.studentId = studentId;
        this.recruiterId = recruiterId;
        this.adminId = adminId;
        this.profileCompleted = profileCompleted;
    }

    public String getId() { return id; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public int getSessionVersion() { return sessionVersion; }
    public String getStudentId() { return studentId; }
    public String getRecruiterId() { return recruiterId; }
    public String getAdminId() { return adminId; }
    public boolean isProfileCompleted() { return profileCompleted; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() { return ""; }

    @Override
    public String getUsername() { return email; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return !"BLOCKED".equals(status); }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
