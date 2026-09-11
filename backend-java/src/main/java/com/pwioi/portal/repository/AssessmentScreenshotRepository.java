package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentScreenshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentScreenshotRepository extends JpaRepository<AssessmentScreenshot, String>, JpaSpecificationExecutor<AssessmentScreenshot> {
    java.util.List<AssessmentScreenshot> findBySessionId(String sessionId);
    java.util.List<AssessmentScreenshot> findByViolationId(String violationId);
}
