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
@Table(name = "mock_interview_drives")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MockInterviewDrive {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "title")
    private String title;

    @Column(name = "category")
    private String category;

    @Column(name = "enableCodeConsole")
    private Boolean enableCodeConsole;

    @Column(name = "codingQuestions")
    private String codingQuestions;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "date")
    private Instant date;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Column(name = "slotDuration")
    private Integer slotDuration;

    @Column(name = "breakDuration")
    private Integer breakDuration;

    @Column(name = "bufferTime")
    private Integer bufferTime;

    @Column(name = "targetBatches")
    private String targetBatches;

    @Column(name = "targetBranches")
    private String targetBranches;

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

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Boolean getEnableCodeConsole() { return enableCodeConsole; }
    public void setEnableCodeConsole(Boolean enableCodeConsole) { this.enableCodeConsole = enableCodeConsole; }

    public String getCodingQuestions() { return codingQuestions; }
    public void setCodingQuestions(String codingQuestions) { this.codingQuestions = codingQuestions; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public Instant getDate() { return date; }
    public void setDate(Instant date) { this.date = date; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public Integer getSlotDuration() { return slotDuration; }
    public void setSlotDuration(Integer slotDuration) { this.slotDuration = slotDuration; }

    public Integer getBreakDuration() { return breakDuration; }
    public void setBreakDuration(Integer breakDuration) { this.breakDuration = breakDuration; }

    public Integer getBufferTime() { return bufferTime; }
    public void setBufferTime(Integer bufferTime) { this.bufferTime = bufferTime; }

    public String getTargetBatches() { return targetBatches; }
    public void setTargetBatches(String targetBatches) { this.targetBatches = targetBatches; }

    public String getTargetBranches() { return targetBranches; }
    public void setTargetBranches(String targetBranches) { this.targetBranches = targetBranches; }

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
