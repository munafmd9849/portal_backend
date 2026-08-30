package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, String>, JpaSpecificationExecutor<AssessmentQuestion> {
    java.util.List<AssessmentQuestion> findByAssessmentId(String assessmentId);
}
