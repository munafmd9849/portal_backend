package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JobRepository extends JpaRepository<Job, String>, JpaSpecificationExecutor<Job> {
    java.util.List<Job> findByCompanyId(String companyId);
    java.util.List<Job> findByRecruiterId(String recruiterId);
    java.util.List<Job> findByLinkedAssessmentId(String linkedAssessmentId);
    java.util.List<Job> findByCreatedByOrderByCreatedAtDesc(String createdBy);
    java.util.List<Job> findByStatusAndIsPostedTrueOrderByPostedAtDesc(String status);
    long countByCreatedBy(String createdBy);
    long countByUpdatedBy(String updatedBy);
}
