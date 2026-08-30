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
@Table(name = "applications")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Application {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "jobId")
    private String jobId;

    @Column(name = "companyId")
    private String companyId;

    @Column(name = "status")
    private String status;

    @Column(name = "appliedDate")
    @CreationTimestamp
    private Instant appliedDate;

    @Column(name = "interviewDate")
    private Instant interviewDate;

    @Column(name = "screeningStatus")
    private String screeningStatus;

    @Column(name = "screeningRemarks")
    private String screeningRemarks;

    @Column(name = "screeningCompletedAt")
    private Instant screeningCompletedAt;

    @Column(name = "interviewStatus")
    private String interviewStatus;

    @Column(name = "lastRoundReached")
    private Integer lastRoundReached;

    @Column(name = "notes")
    private String notes;

    @Column(name = "revokedBy")
    private String revokedBy;

    @Column(name = "revokedAt")
    private Instant revokedAt;

    @Column(name = "revokedReason")
    private String revokedReason;

    @Column(name = "previousStatus")
    private String previousStatus;

    @Column(name = "pipelineStatus")
    private String pipelineStatus;

    @Column(name = "pipelineSubStatus")
    private String pipelineSubStatus;

    @Column(name = "segment")
    private String segment;

    @Column(name = "customAnswers")
    private String customAnswers;

    @Column(name = "offerCtc")
    private String offerCtc;

    @Column(name = "offerStipend")
    private String offerStipend;

    @Column(name = "offerLetterUrl")
    private String offerLetterUrl;

    @Column(name = "offerDeadlineAt")
    private Instant offerDeadlineAt;

    @Column(name = "joinedAt")
    private Instant joinedAt;

    @Column(name = "placementType")
    private String placementType;

    @Column(name = "internshipStatus")
    private String internshipStatus;

    @Column(name = "applicationSource")
    private String applicationSource;

    @Column(name = "attendanceStatus")
    private String attendanceStatus;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getAppliedDate() { return appliedDate; }
    public void setAppliedDate(Instant appliedDate) { this.appliedDate = appliedDate; }

    public Instant getInterviewDate() { return interviewDate; }
    public void setInterviewDate(Instant interviewDate) { this.interviewDate = interviewDate; }

    public String getScreeningStatus() { return screeningStatus; }
    public void setScreeningStatus(String screeningStatus) { this.screeningStatus = screeningStatus; }

    public String getScreeningRemarks() { return screeningRemarks; }
    public void setScreeningRemarks(String screeningRemarks) { this.screeningRemarks = screeningRemarks; }

    public Instant getScreeningCompletedAt() { return screeningCompletedAt; }
    public void setScreeningCompletedAt(Instant screeningCompletedAt) { this.screeningCompletedAt = screeningCompletedAt; }

    public String getInterviewStatus() { return interviewStatus; }
    public void setInterviewStatus(String interviewStatus) { this.interviewStatus = interviewStatus; }

    public Integer getLastRoundReached() { return lastRoundReached; }
    public void setLastRoundReached(Integer lastRoundReached) { this.lastRoundReached = lastRoundReached; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getRevokedBy() { return revokedBy; }
    public void setRevokedBy(String revokedBy) { this.revokedBy = revokedBy; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public String getRevokedReason() { return revokedReason; }
    public void setRevokedReason(String revokedReason) { this.revokedReason = revokedReason; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getPipelineStatus() { return pipelineStatus; }
    public void setPipelineStatus(String pipelineStatus) { this.pipelineStatus = pipelineStatus; }

    public String getPipelineSubStatus() { return pipelineSubStatus; }
    public void setPipelineSubStatus(String pipelineSubStatus) { this.pipelineSubStatus = pipelineSubStatus; }

    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }

    public String getCustomAnswers() { return customAnswers; }
    public void setCustomAnswers(String customAnswers) { this.customAnswers = customAnswers; }

    public String getOfferCtc() { return offerCtc; }
    public void setOfferCtc(String offerCtc) { this.offerCtc = offerCtc; }

    public String getOfferStipend() { return offerStipend; }
    public void setOfferStipend(String offerStipend) { this.offerStipend = offerStipend; }

    public String getOfferLetterUrl() { return offerLetterUrl; }
    public void setOfferLetterUrl(String offerLetterUrl) { this.offerLetterUrl = offerLetterUrl; }

    public Instant getOfferDeadlineAt() { return offerDeadlineAt; }
    public void setOfferDeadlineAt(Instant offerDeadlineAt) { this.offerDeadlineAt = offerDeadlineAt; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public String getPlacementType() { return placementType; }
    public void setPlacementType(String placementType) { this.placementType = placementType; }

    public String getInternshipStatus() { return internshipStatus; }
    public void setInternshipStatus(String internshipStatus) { this.internshipStatus = internshipStatus; }

    public String getApplicationSource() { return applicationSource; }
    public void setApplicationSource(String applicationSource) { this.applicationSource = applicationSource; }

    public String getAttendanceStatus() { return attendanceStatus; }
    public void setAttendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; }

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
