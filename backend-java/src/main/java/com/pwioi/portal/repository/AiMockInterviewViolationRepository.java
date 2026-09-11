package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewViolationRepository extends JpaRepository<AiMockInterviewViolation, String>, JpaSpecificationExecutor<AiMockInterviewViolation> {
    java.util.List<AiMockInterviewViolation> findByEnrollmentId(String enrollmentId);
}
