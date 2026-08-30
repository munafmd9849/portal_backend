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
@Table(name = "cms_versions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CmsVersion {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "pageSlug")
    private String pageSlug;

    @Column(name = "version")
    private Integer version;

    @Column(name = "label")
    private String label;

    @Column(name = "snapshot", columnDefinition = "TEXT")
    private String snapshot;

    @Column(name = "createdById")
    private String createdById;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPageSlug() { return pageSlug; }
    public void setPageSlug(String pageSlug) { this.pageSlug = pageSlug; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getSnapshot() { return snapshot; }
    public void setSnapshot(String snapshot) { this.snapshot = snapshot; }

    public String getCreatedById() { return createdById; }
    public void setCreatedById(String createdById) { this.createdById = createdById; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
