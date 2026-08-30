package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentAssignmentRepository extends JpaRepository<AssessmentAssignment, String>, JpaSpecificationExecutor<AssessmentAssignment> {
    java.util.List<AssessmentAssignment> findByAssessmentId(String assessmentId);
    java.util.List<AssessmentAssignment> findByStudentId(String studentId);
    java.util.List<AssessmentAssignment> findByBatchId(String batchId);
    java.util.List<AssessmentAssignment> findBySchoolId(String schoolId);
}
