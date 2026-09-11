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
@Table(name = "success_stories")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SuccessStory {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "type")
    private String type;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "richContent")
    private String richContent;

    @Column(name = "images")
    private String images;

    @Column(name = "videoUrl")
    private String videoUrl;

    @Column(name = "company")
    private String company;

    @Column(name = "studentName")
    private String studentName;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "email")
    private String email;

    @Column(name = "linkedin")
    private String linkedin;

    @Column(name = "branch")
    private String branch;

    @Column(name = "campus")
    private String campus;

    @Column(name = "batch")
    private String batch;

    @Column(name = "packageCtc")
    private String packageCtc;

    @Column(name = "jobRole")
    private String jobRole;

    @Column(name = "tags")
    private String tags;

    @Column(name = "status")
    private String status;

    @Column(name = "featured")
    private Boolean featured;

    @Column(name = "sortOrder")
    private Integer sortOrder;

    @Column(name = "createdById")
    private String createdById;

    @Column(name = "updatedById")
    private String updatedById;

    @Column(name = "publishedAt")
    private Instant publishedAt;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRichContent() { return richContent; }
    public void setRichContent(String richContent) { this.richContent = richContent; }

    public String getImages() { return images; }
    public void setImages(String images) { this.images = images; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getLinkedin() { return linkedin; }
    public void setLinkedin(String linkedin) { this.linkedin = linkedin; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getCampus() { return campus; }
    public void setCampus(String campus) { this.campus = campus; }

    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }

    public String getPackageCtc() { return packageCtc; }
    public void setPackageCtc(String packageCtc) { this.packageCtc = packageCtc; }

    public String getJobRole() { return jobRole; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getFeatured() { return featured; }
    public void setFeatured(Boolean featured) { this.featured = featured; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getCreatedById() { return createdById; }
    public void setCreatedById(String createdById) { this.createdById = createdById; }

    public String getUpdatedById() { return updatedById; }
    public void setUpdatedById(String updatedById) { this.updatedById = updatedById; }

    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }

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
