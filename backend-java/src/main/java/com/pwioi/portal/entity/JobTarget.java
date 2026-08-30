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
@Table(name = "job_student_targets")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class JobTarget {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "jobId")
    private String jobId;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "score")
    private Double score;

    @Column(name = "sourceMode")
    private String sourceMode;

    @Column(name = "selectedByAdmin")
    private Boolean selectedByAdmin;

    @Column(name = "viewedAt")
    private Instant viewedAt;

    @Column(name = "appliedAt")
    private Instant appliedAt;

    @Column(name = "status")
    private String status;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getSourceMode() { return sourceMode; }
    public void setSourceMode(String sourceMode) { this.sourceMode = sourceMode; }

    public Boolean getSelectedByAdmin() { return selectedByAdmin; }
    public void setSelectedByAdmin(Boolean selectedByAdmin) { this.selectedByAdmin = selectedByAdmin; }

    public Instant getViewedAt() { return viewedAt; }
    public void setViewedAt(Instant viewedAt) { this.viewedAt = viewedAt; }

    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant appliedAt) { this.appliedAt = appliedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

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
