package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterviewEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewEnrollmentRepository extends JpaRepository<AiMockInterviewEnrollment, String>, JpaSpecificationExecutor<AiMockInterviewEnrollment> {
    java.util.Optional<AiMockInterviewEnrollment> findByInterviewIdAndStudentId(String interviewId, String studentId);
    java.util.List<AiMockInterviewEnrollment> findByInterviewId(String interviewId);
    java.util.List<AiMockInterviewEnrollment> findByStudentId(String studentId);
}
