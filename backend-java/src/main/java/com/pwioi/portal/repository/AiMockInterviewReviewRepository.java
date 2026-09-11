package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewReviewRepository extends JpaRepository<AiMockInterviewReview, String>, JpaSpecificationExecutor<AiMockInterviewReview> {
    java.util.Optional<AiMockInterviewReview> findByEnrollmentId(String enrollmentId);
    boolean existsByEnrollmentId(String enrollmentId);
}
