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
@Table(name = "ai_mock_interview_violations")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiMockInterviewViolation {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "enrollmentId")
    private String enrollmentId;

    @Column(name = "type")
    private String type;

    @Column(name = "details")
    private String details;

    @Column(name = "meta")
    private String meta;

    @Column(name = "timestamp")
    @CreationTimestamp
    private Instant timestamp;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(String enrollmentId) { this.enrollmentId = enrollmentId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
