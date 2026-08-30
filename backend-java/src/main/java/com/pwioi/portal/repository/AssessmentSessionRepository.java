package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentSessionRepository extends JpaRepository<AssessmentSession, String>, JpaSpecificationExecutor<AssessmentSession> {
    java.util.Optional<AssessmentSession> findByAssessmentIdAndStudentId(String assessmentId, String studentId);
    java.util.List<AssessmentSession> findByAssessmentId(String assessmentId);
    java.util.List<AssessmentSession> findByStudentId(String studentId);
}
