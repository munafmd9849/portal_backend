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
@Table(name = "assessment_screenshots")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentScreenshot {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "sessionId")
    private String sessionId;

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

    @Column(name = "violationId")
    private String violationId;

    @Column(name = "flags")
    private String flags;

    @Column(name = "faceCount")
    private Integer faceCount;

    @Column(name = "bytes")
    private Integer bytes;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "format")
    private String format;

    @Column(name = "timestamp")
    @CreationTimestamp
    private Instant timestamp;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

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

    public String getViolationId() { return violationId; }
    public void setViolationId(String violationId) { this.violationId = violationId; }

    public String getFlags() { return flags; }
    public void setFlags(String flags) { this.flags = flags; }

    public Integer getFaceCount() { return faceCount; }
    public void setFaceCount(Integer faceCount) { this.faceCount = faceCount; }

    public Integer getBytes() { return bytes; }
    public void setBytes(Integer bytes) { this.bytes = bytes; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
