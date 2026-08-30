package com.pwioi.portal.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.DynamicInsert;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@DynamicInsert
@Table(name = "users")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "passwordHash")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String passwordHash;

    @Column(name = "role")
    private String role;

    @Column(name = "status")
    private String status;

    @Column(name = "emailVerified")
    private Boolean emailVerified;

    @Column(name = "emailVerifiedAt")
    private Instant emailVerifiedAt;

    @Column(name = "recruiterVerified")
    private Boolean recruiterVerified;

    @Column(name = "displayName")
    private String displayName;

    @Column(name = "profilePhoto")
    private String profilePhoto;

    @Column(name = "blockInfo")
    private String blockInfo;

    @Column(name = "googleCalendarConnected")
    private Boolean googleCalendarConnected;

    @Column(name = "connectedGoogleEmail")
    private String connectedGoogleEmail;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    @Column(name = "lastLoginAt")
    private Instant lastLoginAt;

    @Column(name = "sessionVersion")
    private Integer sessionVersion;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }

    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public void setEmailVerifiedAt(Instant emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }

    public Boolean getRecruiterVerified() { return recruiterVerified; }
    public void setRecruiterVerified(Boolean recruiterVerified) { this.recruiterVerified = recruiterVerified; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public String getBlockInfo() { return blockInfo; }
    public void setBlockInfo(String blockInfo) { this.blockInfo = blockInfo; }

    public Boolean getGoogleCalendarConnected() { return googleCalendarConnected; }
    public void setGoogleCalendarConnected(Boolean googleCalendarConnected) { this.googleCalendarConnected = googleCalendarConnected; }

    public String getConnectedGoogleEmail() { return connectedGoogleEmail; }
    public void setConnectedGoogleEmail(String connectedGoogleEmail) { this.connectedGoogleEmail = connectedGoogleEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public Integer getSessionVersion() { return sessionVersion; }
    public void setSessionVersion(Integer sessionVersion) { this.sessionVersion = sessionVersion; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
