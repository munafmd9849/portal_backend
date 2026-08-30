package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewerInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewerInviteRepository extends JpaRepository<InterviewerInvite, String>, JpaSpecificationExecutor<InterviewerInvite> {
    java.util.Optional<InterviewerInvite> findByToken(String token);
    boolean existsByToken(String token);
    java.util.Optional<InterviewerInvite> findBySessionIdAndEmail(String sessionId, String email);
    java.util.List<InterviewerInvite> findBySessionId(String sessionId);
}
