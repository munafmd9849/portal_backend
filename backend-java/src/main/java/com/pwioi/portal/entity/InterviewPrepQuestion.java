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
@Table(name = "interview_prep_questions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InterviewPrepQuestion {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "sessionId")
    private String sessionId;

    @Column(name = "orderIndex")
    private Integer orderIndex;

    @Column(name = "inputType")
    private String inputType;

    @Column(name = "category")
    private String category;

    @Column(name = "title")
    private String title;

    @Column(name = "prompt")
    private String prompt;

    @Column(name = "starterCode")
    private String starterCode;

    @Column(name = "language")
    private String language;

    @Column(name = "idealAnswer")
    private String idealAnswer;

    @Column(name = "hints")
    private String hints;

    @Column(name = "studentText")
    private String studentText;

    @Column(name = "studentCode")
    private String studentCode;

    @Column(name = "transcript")
    private String transcript;

    @Column(name = "technicalScore")
    private Double technicalScore;

    @Column(name = "confidenceScore")
    private Double confidenceScore;

    @Column(name = "feedbackJson", columnDefinition = "TEXT")
    private String feedbackJson;

    @Column(name = "status")
    private String status;

    @Column(name = "answeredAt")
    private Instant answeredAt;

    @Column(name = "evaluatedAt")
    private Instant evaluatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

    public String getInputType() { return inputType; }
    public void setInputType(String inputType) { this.inputType = inputType; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }

    public String getStarterCode() { return starterCode; }
    public void setStarterCode(String starterCode) { this.starterCode = starterCode; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getIdealAnswer() { return idealAnswer; }
    public void setIdealAnswer(String idealAnswer) { this.idealAnswer = idealAnswer; }

    public String getHints() { return hints; }
    public void setHints(String hints) { this.hints = hints; }

    public String getStudentText() { return studentText; }
    public void setStudentText(String studentText) { this.studentText = studentText; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getTranscript() { return transcript; }
    public void setTranscript(String transcript) { this.transcript = transcript; }

    public Double getTechnicalScore() { return technicalScore; }
    public void setTechnicalScore(Double technicalScore) { this.technicalScore = technicalScore; }

    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }

    public String getFeedbackJson() { return feedbackJson; }
    public void setFeedbackJson(String feedbackJson) { this.feedbackJson = feedbackJson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getAnsweredAt() { return answeredAt; }
    public void setAnsweredAt(Instant answeredAt) { this.answeredAt = answeredAt; }

    public Instant getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(Instant evaluatedAt) { this.evaluatedAt = evaluatedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
