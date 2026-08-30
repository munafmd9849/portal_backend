package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewPrepSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewPrepSessionRepository extends JpaRepository<InterviewPrepSession, String>, JpaSpecificationExecutor<InterviewPrepSession> {
    java.util.List<InterviewPrepSession> findByStudentId(String studentId);
    java.util.List<InterviewPrepSession> findByJobId(String jobId);
}
