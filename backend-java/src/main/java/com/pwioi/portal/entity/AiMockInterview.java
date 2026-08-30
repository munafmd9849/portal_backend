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
@Table(name = "ai_mock_interviews")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterview {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "sessionMode")
    private String sessionMode;

    @Column(name = "interviewType")
    private String interviewType;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "conversationalTopic")
    private String conversationalTopic;

    @Column(name = "conversationalMaxTurns")
    private Integer conversationalMaxTurns;

    @Column(name = "startDate")
    private Instant startDate;

    @Column(name = "endDate")
    private Instant endDate;

    @Column(name = "targetBatches")
    private String targetBatches;

    @Column(name = "targetBranches")
    private String targetBranches;

    @Column(name = "targetCenters")
    private String targetCenters;

    @Column(name = "targetSchoolIds")
    private String targetSchoolIds;

    @Column(name = "targetStudentIds")
    private String targetStudentIds;

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

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSessionMode() { return sessionMode; }
    public void setSessionMode(String sessionMode) { this.sessionMode = sessionMode; }

    public String getInterviewType() { return interviewType; }
    public void setInterviewType(String interviewType) { this.interviewType = interviewType; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getConversationalTopic() { return conversationalTopic; }
    public void setConversationalTopic(String conversationalTopic) { this.conversationalTopic = conversationalTopic; }

    public Integer getConversationalMaxTurns() { return conversationalMaxTurns; }
    public void setConversationalMaxTurns(Integer conversationalMaxTurns) { this.conversationalMaxTurns = conversationalMaxTurns; }

    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }

    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }

    public String getTargetBatches() { return targetBatches; }
    public void setTargetBatches(String targetBatches) { this.targetBatches = targetBatches; }

    public String getTargetBranches() { return targetBranches; }
    public void setTargetBranches(String targetBranches) { this.targetBranches = targetBranches; }

    public String getTargetCenters() { return targetCenters; }
    public void setTargetCenters(String targetCenters) { this.targetCenters = targetCenters; }

    public String getTargetSchoolIds() { return targetSchoolIds; }
    public void setTargetSchoolIds(String targetSchoolIds) { this.targetSchoolIds = targetSchoolIds; }

    public String getTargetStudentIds() { return targetStudentIds; }
    public void setTargetStudentIds(String targetStudentIds) { this.targetStudentIds = targetStudentIds; }

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
