package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String>, JpaSpecificationExecutor<InterviewSession> {
    java.util.Optional<InterviewSession> findByJobId(String jobId);
    boolean existsByJobId(String jobId);
    java.util.List<InterviewSession> findByCompanyId(String companyId);
    java.util.List<InterviewSession> findByJobIdIn(java.util.Collection<String> jobIds);
}
