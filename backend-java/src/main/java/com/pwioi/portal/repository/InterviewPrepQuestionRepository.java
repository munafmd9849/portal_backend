package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewPrepQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewPrepQuestionRepository extends JpaRepository<InterviewPrepQuestion, String>, JpaSpecificationExecutor<InterviewPrepQuestion> {
    java.util.List<InterviewPrepQuestion> findBySessionId(String sessionId);
}
