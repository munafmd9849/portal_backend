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
@Table(name = "cms_sections")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CmsSection {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "pageSlug")
    private String pageSlug;

    @Column(name = "sectionKey")
    private String sectionKey;

    @Column(name = "title")
    private String title;

    @Column(name = "subtitle")
    private String subtitle;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "mediaUrl")
    private String mediaUrl;

    @Column(name = "mediaPublicId")
    private String mediaPublicId;

    @Column(name = "mediaType")
    private String mediaType;

    @Column(name = "ctaLabel")
    private String ctaLabel;

    @Column(name = "ctaUrl")
    private String ctaUrl;

    @Column(name = "meta")
    private String meta;

    @Column(name = "sortOrder")
    private Integer sortOrder;

    @Column(name = "status")
    private String status;

    @Column(name = "publishedAt")
    private Instant publishedAt;

    @Column(name = "createdById")
    private String createdById;

    @Column(name = "updatedById")
    private String updatedById;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPageSlug() { return pageSlug; }
    public void setPageSlug(String pageSlug) { this.pageSlug = pageSlug; }

    public String getSectionKey() { return sectionKey; }
    public void setSectionKey(String sectionKey) { this.sectionKey = sectionKey; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getMediaPublicId() { return mediaPublicId; }
    public void setMediaPublicId(String mediaPublicId) { this.mediaPublicId = mediaPublicId; }

    public String getMediaType() { return mediaType; }
    public void setMediaType(String mediaType) { this.mediaType = mediaType; }

    public String getCtaLabel() { return ctaLabel; }
    public void setCtaLabel(String ctaLabel) { this.ctaLabel = ctaLabel; }

    public String getCtaUrl() { return ctaUrl; }
    public void setCtaUrl(String ctaUrl) { this.ctaUrl = ctaUrl; }

    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }

    public String getCreatedById() { return createdById; }
    public void setCreatedById(String createdById) { this.createdById = createdById; }

    public String getUpdatedById() { return updatedById; }
    public void setUpdatedById(String updatedById) { this.updatedById = updatedById; }

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
