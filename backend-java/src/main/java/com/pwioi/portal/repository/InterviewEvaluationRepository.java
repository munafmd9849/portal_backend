package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, String>, JpaSpecificationExecutor<InterviewEvaluation> {
    java.util.Optional<InterviewEvaluation> findByInterviewIdAndStudentIdAndRoundName(String interviewId, String studentId, String roundName);
    java.util.List<InterviewEvaluation> findByInterviewId(String interviewId);
    java.util.List<InterviewEvaluation> findByStudentId(String studentId);
}
