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
@Table(name = "ai_mock_interview_questions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterviewQuestion {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "interviewId")
    private String interviewId;

    @Column(name = "orderIndex")
    private Integer orderIndex;

    @Column(name = "questionText")
    private String questionText;

    @Column(name = "notes")
    private String notes;

    @Column(name = "prepTimeSeconds")
    private Integer prepTimeSeconds;

    @Column(name = "answerTimeSeconds")
    private Integer answerTimeSeconds;

    @Column(name = "mandatory")
    private Boolean mandatory;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "updatedAt")
    @UpdateTimestamp
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInterviewId() { return interviewId; }
    public void setInterviewId(String interviewId) { this.interviewId = interviewId; }

    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Integer getPrepTimeSeconds() { return prepTimeSeconds; }
    public void setPrepTimeSeconds(Integer prepTimeSeconds) { this.prepTimeSeconds = prepTimeSeconds; }

    public Integer getAnswerTimeSeconds() { return answerTimeSeconds; }
    public void setAnswerTimeSeconds(Integer answerTimeSeconds) { this.answerTimeSeconds = answerTimeSeconds; }

    public Boolean getMandatory() { return mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }

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
