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
@Table(name = "ai_mock_interview_ai_insights")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterviewAiInsight {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "enrollmentId", unique = true)
    private String enrollmentId;

    @Column(name = "communicationScore")
    private Integer communicationScore;

    @Column(name = "confidenceScore")
    private Integer confidenceScore;

    @Column(name = "clarityScore")
    private Integer clarityScore;

    @Column(name = "technicalUnderstanding")
    private Integer technicalUnderstanding;

    @Column(name = "technicalDepthScore")
    private Integer technicalDepthScore;

    @Column(name = "professionalismScore")
    private Integer professionalismScore;

    @Column(name = "behavioralScore")
    private Integer behavioralScore;

    @Column(name = "overallPerformance")
    private Integer overallPerformance;

    @Column(name = "strengths")
    private String strengths;

    @Column(name = "improvements")
    private String improvements;

    @Column(name = "recommendedFocus")
    private String recommendedFocus;

    @Column(name = "interviewSummary")
    private String interviewSummary;

    @Column(name = "improvementPlan")
    private String improvementPlan;

    @Column(name = "rawJson", columnDefinition = "TEXT")
    private String rawJson;

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

    public String getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(String enrollmentId) { this.enrollmentId = enrollmentId; }

    public Integer getCommunicationScore() { return communicationScore; }
    public void setCommunicationScore(Integer communicationScore) { this.communicationScore = communicationScore; }

    public Integer getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Integer confidenceScore) { this.confidenceScore = confidenceScore; }

    public Integer getClarityScore() { return clarityScore; }
    public void setClarityScore(Integer clarityScore) { this.clarityScore = clarityScore; }

    public Integer getTechnicalUnderstanding() { return technicalUnderstanding; }
    public void setTechnicalUnderstanding(Integer technicalUnderstanding) { this.technicalUnderstanding = technicalUnderstanding; }

    public Integer getTechnicalDepthScore() { return technicalDepthScore; }
    public void setTechnicalDepthScore(Integer technicalDepthScore) { this.technicalDepthScore = technicalDepthScore; }

    public Integer getProfessionalismScore() { return professionalismScore; }
    public void setProfessionalismScore(Integer professionalismScore) { this.professionalismScore = professionalismScore; }

    public Integer getBehavioralScore() { return behavioralScore; }
    public void setBehavioralScore(Integer behavioralScore) { this.behavioralScore = behavioralScore; }

    public Integer getOverallPerformance() { return overallPerformance; }
    public void setOverallPerformance(Integer overallPerformance) { this.overallPerformance = overallPerformance; }

    public String getStrengths() { return strengths; }
    public void setStrengths(String strengths) { this.strengths = strengths; }

    public String getImprovements() { return improvements; }
    public void setImprovements(String improvements) { this.improvements = improvements; }

    public String getRecommendedFocus() { return recommendedFocus; }
    public void setRecommendedFocus(String recommendedFocus) { this.recommendedFocus = recommendedFocus; }

    public String getInterviewSummary() { return interviewSummary; }
    public void setInterviewSummary(String interviewSummary) { this.interviewSummary = interviewSummary; }

    public String getImprovementPlan() { return improvementPlan; }
    public void setImprovementPlan(String improvementPlan) { this.improvementPlan = improvementPlan; }

    public String getRawJson() { return rawJson; }
    public void setRawJson(String rawJson) { this.rawJson = rawJson; }

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
