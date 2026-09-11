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
@Table(name = "assessment_sessions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentSession {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "assessmentId")
    private String assessmentId;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "startTime")
    @CreationTimestamp
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Column(name = "status")
    private String status;

    @Column(name = "score")
    private Double score;

    @Column(name = "responses", columnDefinition = "TEXT")
    private String responses;

    @Column(name = "violationsCount")
    private Integer violationsCount;

    @Column(name = "warningCount")
    private Integer warningCount;

    @Column(name = "riskLevel")
    private String riskLevel;

    @Column(name = "lastWarningAt")
    private Instant lastWarningAt;

    @Column(name = "secureModeMeta")
    private String secureModeMeta;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAssessmentId() { return assessmentId; }
    public void setAssessmentId(String assessmentId) { this.assessmentId = assessmentId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getResponses() { return responses; }
    public void setResponses(String responses) { this.responses = responses; }

    public Integer getViolationsCount() { return violationsCount; }
    public void setViolationsCount(Integer violationsCount) { this.violationsCount = violationsCount; }

    public Integer getWarningCount() { return warningCount; }
    public void setWarningCount(Integer warningCount) { this.warningCount = warningCount; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public Instant getLastWarningAt() { return lastWarningAt; }
    public void setLastWarningAt(Instant lastWarningAt) { this.lastWarningAt = lastWarningAt; }

    public String getSecureModeMeta() { return secureModeMeta; }
    public void setSecureModeMeta(String secureModeMeta) { this.secureModeMeta = secureModeMeta; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
