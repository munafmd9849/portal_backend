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
@Table(name = "interview_prep_sessions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InterviewPrepSession {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "role")
    private String role;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "interviewType")
    private String interviewType;

    @Column(name = "jobId")
    private String jobId;

    @Column(name = "jobTitle")
    private String jobTitle;

    @Column(name = "companyName")
    private String companyName;

    @Column(name = "resumeSnapshot")
    private String resumeSnapshot;

    @Column(name = "jdSnapshot")
    private String jdSnapshot;

    @Column(name = "technicalScore")
    private Double technicalScore;

    @Column(name = "confidenceScore")
    private Double confidenceScore;

    @Column(name = "overallScore")
    private Double overallScore;

    @Column(name = "status")
    private String status;

    @Column(name = "analysisJson", columnDefinition = "TEXT")
    private String analysisJson;

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

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getInterviewType() { return interviewType; }
    public void setInterviewType(String interviewType) { this.interviewType = interviewType; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getResumeSnapshot() { return resumeSnapshot; }
    public void setResumeSnapshot(String resumeSnapshot) { this.resumeSnapshot = resumeSnapshot; }

    public String getJdSnapshot() { return jdSnapshot; }
    public void setJdSnapshot(String jdSnapshot) { this.jdSnapshot = jdSnapshot; }

    public Double getTechnicalScore() { return technicalScore; }
    public void setTechnicalScore(Double technicalScore) { this.technicalScore = technicalScore; }

    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }

    public Double getOverallScore() { return overallScore; }
    public void setOverallScore(Double overallScore) { this.overallScore = overallScore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAnalysisJson() { return analysisJson; }
    public void setAnalysisJson(String analysisJson) { this.analysisJson = analysisJson; }

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
