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
@Table(name = "assessment_import_batches")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AssessmentImportBatch {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "assessmentId")
    private String assessmentId;

    @Column(name = "uploadedById")
    private String uploadedById;

    @Column(name = "fileName")
    private String fileName;

    @Column(name = "fileType")
    private String fileType;

    @Column(name = "status")
    private String status;

    @Column(name = "totalRows")
    private Integer totalRows;

    @Column(name = "successCount")
    private Integer successCount;

    @Column(name = "errorCount")
    private Integer errorCount;

    @Column(name = "duplicateCount")
    private Integer duplicateCount;

    @Column(name = "previewData", columnDefinition = "TEXT")
    private String previewData;

    @Column(name = "errorReport", columnDefinition = "TEXT")
    private String errorReport;

    @Column(name = "importedIds")
    private String importedIds;

    @Column(name = "summary")
    private String summary;

    @Column(name = "createdAt")
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "completedAt")
    private Instant completedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAssessmentId() { return assessmentId; }
    public void setAssessmentId(String assessmentId) { this.assessmentId = assessmentId; }

    public String getUploadedById() { return uploadedById; }
    public void setUploadedById(String uploadedById) { this.uploadedById = uploadedById; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTotalRows() { return totalRows; }
    public void setTotalRows(Integer totalRows) { this.totalRows = totalRows; }

    public Integer getSuccessCount() { return successCount; }
    public void setSuccessCount(Integer successCount) { this.successCount = successCount; }

    public Integer getErrorCount() { return errorCount; }
    public void setErrorCount(Integer errorCount) { this.errorCount = errorCount; }

    public Integer getDuplicateCount() { return duplicateCount; }
    public void setDuplicateCount(Integer duplicateCount) { this.duplicateCount = duplicateCount; }

    public String getPreviewData() { return previewData; }
    public void setPreviewData(String previewData) { this.previewData = previewData; }

    public String getErrorReport() { return errorReport; }
    public void setErrorReport(String errorReport) { this.errorReport = errorReport; }

    public String getImportedIds() { return importedIds; }
    public void setImportedIds(String importedIds) { this.importedIds = importedIds; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
