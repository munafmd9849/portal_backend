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
@Table(name = "interview_sessions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InterviewSession {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "jobId", unique = true)
    private String jobId;

    @Column(name = "companyId")
    private String companyId;

    @Column(name = "status")
    private String status;

    @Column(name = "createdBy")
    private String createdBy;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    @Column(name = "startedAt")
    private Instant startedAt;

    @Column(name = "completedAt")
    private Instant completedAt;

    @Column(name = "resultsDeclaredAt")
    private Instant resultsDeclaredAt;

    @Column(name = "resultsLocked")
    private Boolean resultsLocked;

    @Column(name = "shareResultsWithStudents")
    private Boolean shareResultsWithStudents;

    @Column(name = "shareResultsSetAt")
    private Instant shareResultsSetAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Instant getResultsDeclaredAt() { return resultsDeclaredAt; }
    public void setResultsDeclaredAt(Instant resultsDeclaredAt) { this.resultsDeclaredAt = resultsDeclaredAt; }

    public Boolean getResultsLocked() { return resultsLocked; }
    public void setResultsLocked(Boolean resultsLocked) { this.resultsLocked = resultsLocked; }

    public Boolean getShareResultsWithStudents() { return shareResultsWithStudents; }
    public void setShareResultsWithStudents(Boolean shareResultsWithStudents) { this.shareResultsWithStudents = shareResultsWithStudents; }

    public Instant getShareResultsSetAt() { return shareResultsSetAt; }
    public void setShareResultsSetAt(Instant shareResultsSetAt) { this.shareResultsSetAt = shareResultsSetAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
