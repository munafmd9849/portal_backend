package com.pwioi.portal.repository;

import com.pwioi.portal.entity.RecruiterScreeningSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RecruiterScreeningSessionRepository extends JpaRepository<RecruiterScreeningSession, String>, JpaSpecificationExecutor<RecruiterScreeningSession> {
    java.util.Optional<RecruiterScreeningSession> findByJobId(String jobId);
    boolean existsByJobId(String jobId);
    java.util.Optional<RecruiterScreeningSession> findByToken(String token);
    boolean existsByToken(String token);
}
