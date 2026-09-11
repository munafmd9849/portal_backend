package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewAiInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewAiInsightRepository extends JpaRepository<AiMockInterviewAiInsight, String>, JpaSpecificationExecutor<AiMockInterviewAiInsight> {
    java.util.Optional<AiMockInterviewAiInsight> findByEnrollmentId(String enrollmentId);
    boolean existsByEnrollmentId(String enrollmentId);
}
