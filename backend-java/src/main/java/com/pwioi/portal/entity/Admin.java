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
@Table(name = "admins")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Admin {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "userId", unique = true)
    private String userId;

    @Column(name = "name")
    private String name;

    @Column(name = "role")
    private String role;

    @Column(name = "permissions")
    private String permissions;

    @Column(name = "allowedSchools")
    private String allowedSchools;

    @Column(name = "allowedCenters")
    private String allowedCenters;

    @Column(name = "allowedBatches")
    private String allowedBatches;

    @Column(name = "allowedSchoolIds")
    private String allowedSchoolIds;

    @Column(name = "allowedCenterIds")
    private String allowedCenterIds;

    @Column(name = "allowedBatchIds")
    private String allowedBatchIds;

    @Column(name = "createdBy")
    private String createdBy;

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

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }

    public String getAllowedSchools() { return allowedSchools; }
    public void setAllowedSchools(String allowedSchools) { this.allowedSchools = allowedSchools; }

    public String getAllowedCenters() { return allowedCenters; }
    public void setAllowedCenters(String allowedCenters) { this.allowedCenters = allowedCenters; }

    public String getAllowedBatches() { return allowedBatches; }
    public void setAllowedBatches(String allowedBatches) { this.allowedBatches = allowedBatches; }

    public String getAllowedSchoolIds() { return allowedSchoolIds; }
    public void setAllowedSchoolIds(String allowedSchoolIds) { this.allowedSchoolIds = allowedSchoolIds; }

    public String getAllowedCenterIds() { return allowedCenterIds; }
    public void setAllowedCenterIds(String allowedCenterIds) { this.allowedCenterIds = allowedCenterIds; }

    public String getAllowedBatchIds() { return allowedBatchIds; }
    public void setAllowedBatchIds(String allowedBatchIds) { this.allowedBatchIds = allowedBatchIds; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

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
