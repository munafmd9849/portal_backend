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
@Table(name = "google_calendar_tokens")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GoogleCalendarToken {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "userId", unique = true)
    private String userId;

    @Column(name = "accessToken")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String accessToken;

    @Column(name = "refreshToken")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String refreshToken;

    @Column(name = "expiryDate")
    private Instant expiryDate;

    @Column(name = "scope")
    private String scope;

    @Column(name = "connectedGoogleEmail")
    private String connectedGoogleEmail;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public Instant getExpiryDate() { return expiryDate; }
    public void setExpiryDate(Instant expiryDate) { this.expiryDate = expiryDate; }

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }

    public String getConnectedGoogleEmail() { return connectedGoogleEmail; }
    public void setConnectedGoogleEmail(String connectedGoogleEmail) { this.connectedGoogleEmail = connectedGoogleEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
