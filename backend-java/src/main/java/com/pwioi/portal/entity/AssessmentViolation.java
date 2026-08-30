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
@Table(name = "assessment_violations")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentViolation {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "sessionId")
    private String sessionId;

    @Column(name = "type")
    private String type;

    @Column(name = "severity")
    private String severity;

    @Column(name = "timestamp")
    @CreationTimestamp
    private Instant timestamp;

    @Column(name = "details")
    private String details;

    @Column(name = "meta")
    private String meta;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
