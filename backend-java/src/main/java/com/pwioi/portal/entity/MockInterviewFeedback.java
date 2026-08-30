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
@Table(name = "mock_interview_feedback")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MockInterviewFeedback {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "slotId", unique = true)
    private String slotId;

    @Column(name = "communication")
    private Integer communication;

    @Column(name = "confidence")
    private Integer confidence;

    @Column(name = "technicalSkills")
    private Integer technicalSkills;

    @Column(name = "problemSolving")
    private Integer problemSolving;

    @Column(name = "bodyLanguage")
    private Integer bodyLanguage;

    @Column(name = "resumeKnowledge")
    private Integer resumeKnowledge;

    @Column(name = "overallPerformance")
    private Integer overallPerformance;

    @Column(name = "result")
    private String result;

    @Column(name = "detailedRemarks")
    private String detailedRemarks;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }

    public Integer getCommunication() { return communication; }
    public void setCommunication(Integer communication) { this.communication = communication; }

    public Integer getConfidence() { return confidence; }
    public void setConfidence(Integer confidence) { this.confidence = confidence; }

    public Integer getTechnicalSkills() { return technicalSkills; }
    public void setTechnicalSkills(Integer technicalSkills) { this.technicalSkills = technicalSkills; }

    public Integer getProblemSolving() { return problemSolving; }
    public void setProblemSolving(Integer problemSolving) { this.problemSolving = problemSolving; }

    public Integer getBodyLanguage() { return bodyLanguage; }
    public void setBodyLanguage(Integer bodyLanguage) { this.bodyLanguage = bodyLanguage; }

    public Integer getResumeKnowledge() { return resumeKnowledge; }
    public void setResumeKnowledge(Integer resumeKnowledge) { this.resumeKnowledge = resumeKnowledge; }

    public Integer getOverallPerformance() { return overallPerformance; }
    public void setOverallPerformance(Integer overallPerformance) { this.overallPerformance = overallPerformance; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public String getDetailedRemarks() { return detailedRemarks; }
    public void setDetailedRemarks(String detailedRemarks) { this.detailedRemarks = detailedRemarks; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
