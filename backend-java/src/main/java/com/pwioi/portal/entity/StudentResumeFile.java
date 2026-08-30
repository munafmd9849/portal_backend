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
@Table(name = "student_resume_files")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class StudentResumeFile {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "studentId")
    private String studentId;

    @Column(name = "userId")
    private String userId;

    @Column(name = "fileUrl")
    private String fileUrl;

    @Column(name = "fileName")
    private String fileName;

    @Column(name = "fileSize")
    private Integer fileSize;

    @Column(name = "publicId")
    private String publicId;

    @Column(name = "title")
    private String title;

    @Column(name = "isDefault")
    private Boolean isDefault;

    @Column(name = "uploadedAt")
    @CreationTimestamp
    private Instant uploadedAt;

    @Column(name = "atsScore")
    private Integer atsScore;

    @Column(name = "atsScoredAt")
    private Instant atsScoredAt;

    @Column(name = "atsAnalysisJson")
    private String atsAnalysisJson;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Integer getFileSize() { return fileSize; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }

    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) { this.publicId = publicId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }

    public Integer getAtsScore() { return atsScore; }
    public void setAtsScore(Integer atsScore) { this.atsScore = atsScore; }

    public Instant getAtsScoredAt() { return atsScoredAt; }
    public void setAtsScoredAt(Instant atsScoredAt) { this.atsScoredAt = atsScoredAt; }

    public String getAtsAnalysisJson() { return atsAnalysisJson; }
    public void setAtsAnalysisJson(String atsAnalysisJson) { this.atsAnalysisJson = atsAnalysisJson; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
