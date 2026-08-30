package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentViolationRepository extends JpaRepository<AssessmentViolation, String>, JpaSpecificationExecutor<AssessmentViolation> {
    java.util.List<AssessmentViolation> findBySessionId(String sessionId);
}
