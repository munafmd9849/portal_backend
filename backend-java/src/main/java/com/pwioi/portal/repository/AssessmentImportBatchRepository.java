package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentImportBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentImportBatchRepository extends JpaRepository<AssessmentImportBatch, String>, JpaSpecificationExecutor<AssessmentImportBatch> {
    java.util.List<AssessmentImportBatch> findByAssessmentId(String assessmentId);
    java.util.List<AssessmentImportBatch> findByUploadedById(String uploadedById);
}
