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
@Table(name = "announcements")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Announcement {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "link")
    private String link;

    @Column(name = "imageUrl")
    private String imageUrl;

    @Column(name = "imagePublicId")
    private String imagePublicId;

    @Column(name = "targetSchools")
    private String targetSchools;

    @Column(name = "targetBatches")
    private String targetBatches;

    @Column(name = "targetCenters")
    private String targetCenters;

    @Column(name = "targetSchoolIds")
    private String targetSchoolIds;

    @Column(name = "targetBatchIds")
    private String targetBatchIds;

    @Column(name = "targetCenterIds")
    private String targetCenterIds;

    @Column(name = "createdBy")
    private String createdBy;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImagePublicId() { return imagePublicId; }
    public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

    public String getTargetSchools() { return targetSchools; }
    public void setTargetSchools(String targetSchools) { this.targetSchools = targetSchools; }

    public String getTargetBatches() { return targetBatches; }
    public void setTargetBatches(String targetBatches) { this.targetBatches = targetBatches; }

    public String getTargetCenters() { return targetCenters; }
    public void setTargetCenters(String targetCenters) { this.targetCenters = targetCenters; }

    public String getTargetSchoolIds() { return targetSchoolIds; }
    public void setTargetSchoolIds(String targetSchoolIds) { this.targetSchoolIds = targetSchoolIds; }

    public String getTargetBatchIds() { return targetBatchIds; }
    public void setTargetBatchIds(String targetBatchIds) { this.targetBatchIds = targetBatchIds; }

    public String getTargetCenterIds() { return targetCenterIds; }
    public void setTargetCenterIds(String targetCenterIds) { this.targetCenterIds = targetCenterIds; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
