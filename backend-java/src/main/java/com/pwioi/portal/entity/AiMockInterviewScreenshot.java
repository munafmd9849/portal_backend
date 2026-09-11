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
@Table(name = "ai_mock_interview_screenshots")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterviewScreenshot {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "enrollmentId")
    private String enrollmentId;

    @Column(name = "imageUrl")
    private String imageUrl;

    @Column(name = "publicId")
    private String publicId;

    @Column(name = "captureType")
    private String captureType;

    @Column(name = "event")
    private String event;

    @Column(name = "riskFlag")
    private Boolean riskFlag;

    @Column(name = "faceCount")
    private Integer faceCount;

    @Column(name = "timestamp")
    @CreationTimestamp
    private Instant timestamp;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(String enrollmentId) { this.enrollmentId = enrollmentId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) { this.publicId = publicId; }

    public String getCaptureType() { return captureType; }
    public void setCaptureType(String captureType) { this.captureType = captureType; }

    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }

    public Boolean getRiskFlag() { return riskFlag; }
    public void setRiskFlag(Boolean riskFlag) { this.riskFlag = riskFlag; }

    public Integer getFaceCount() { return faceCount; }
    public void setFaceCount(Integer faceCount) { this.faceCount = faceCount; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
