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
@Table(name = "assessment_assignments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentAssignment {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "assessmentId")
    private String assessmentId;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "batchId")
    private String batchId;

    @Column(name = "schoolId")
    private String schoolId;

    @Column(name = "scheduledAt")
    private Instant scheduledAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAssessmentId() { return assessmentId; }
    public void setAssessmentId(String assessmentId) { this.assessmentId = assessmentId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getSchoolId() { return schoolId; }
    public void setSchoolId(String schoolId) { this.schoolId = schoolId; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
