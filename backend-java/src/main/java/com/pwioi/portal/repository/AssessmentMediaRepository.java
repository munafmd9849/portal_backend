package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentMediaRepository extends JpaRepository<AssessmentMedia, String>, JpaSpecificationExecutor<AssessmentMedia> {
    java.util.List<AssessmentMedia> findBySessionId(String sessionId);
}
