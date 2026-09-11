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
@Table(name = "ai_mock_interview_answers")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterviewAnswer {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "enrollmentId")
    private String enrollmentId;

    @Column(name = "questionId")
    private String questionId;

    @Column(name = "videoUrl")
    private String videoUrl;

    @Column(name = "videoPublicId")
    private String videoPublicId;

    @Column(name = "audioUrl")
    private String audioUrl;

    @Column(name = "audioPublicId")
    private String audioPublicId;

    @Column(name = "durationSeconds")
    private Integer durationSeconds;

    @Column(name = "transcriptText")
    private String transcriptText;

    @Column(name = "transcriptStatus")
    private String transcriptStatus;

    @Column(name = "acknowledgementText")
    private String acknowledgementText;

    @Column(name = "transitionText")
    private String transitionText;

    @Column(name = "submittedAt")
    private Instant submittedAt;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(String enrollmentId) { this.enrollmentId = enrollmentId; }

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getVideoPublicId() { return videoPublicId; }
    public void setVideoPublicId(String videoPublicId) { this.videoPublicId = videoPublicId; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getAudioPublicId() { return audioPublicId; }
    public void setAudioPublicId(String audioPublicId) { this.audioPublicId = audioPublicId; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public String getTranscriptText() { return transcriptText; }
    public void setTranscriptText(String transcriptText) { this.transcriptText = transcriptText; }

    public String getTranscriptStatus() { return transcriptStatus; }
    public void setTranscriptStatus(String transcriptStatus) { this.transcriptStatus = transcriptStatus; }

    public String getAcknowledgementText() { return acknowledgementText; }
    public void setAcknowledgementText(String acknowledgementText) { this.acknowledgementText = acknowledgementText; }

    public String getTransitionText() { return transitionText; }
    public void setTransitionText(String transitionText) { this.transitionText = transitionText; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
