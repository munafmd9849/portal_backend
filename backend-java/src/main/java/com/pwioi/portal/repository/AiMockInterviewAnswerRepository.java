package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewAnswerRepository extends JpaRepository<AiMockInterviewAnswer, String>, JpaSpecificationExecutor<AiMockInterviewAnswer> {
    java.util.Optional<AiMockInterviewAnswer> findByEnrollmentIdAndQuestionId(String enrollmentId, String questionId);
    java.util.List<AiMockInterviewAnswer> findByEnrollmentId(String enrollmentId);
    java.util.List<AiMockInterviewAnswer> findByQuestionId(String questionId);
}
