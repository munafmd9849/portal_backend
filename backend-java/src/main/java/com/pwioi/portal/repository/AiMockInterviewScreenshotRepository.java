package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewScreenshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewScreenshotRepository extends JpaRepository<AiMockInterviewScreenshot, String>, JpaSpecificationExecutor<AiMockInterviewScreenshot> {
    java.util.List<AiMockInterviewScreenshot> findByEnrollmentId(String enrollmentId);
}
