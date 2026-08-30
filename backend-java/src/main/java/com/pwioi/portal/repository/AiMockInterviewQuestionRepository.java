package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewQuestionRepository extends JpaRepository<AiMockInterviewQuestion, String>, JpaSpecificationExecutor<AiMockInterviewQuestion> {
    java.util.List<AiMockInterviewQuestion> findByInterviewId(String interviewId);
}
