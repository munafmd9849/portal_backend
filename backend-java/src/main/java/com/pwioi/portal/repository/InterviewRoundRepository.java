package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewRoundRepository extends JpaRepository<InterviewRound, String>, JpaSpecificationExecutor<InterviewRound> {
    java.util.Optional<InterviewRound> findBySessionIdAndRoundNumber(String sessionId, Integer roundNumber);
    java.util.Optional<InterviewRound> findBySessionIdAndName(String sessionId, String name);
    java.util.List<InterviewRound> findBySessionId(String sessionId);
    java.util.List<InterviewRound> findBySessionIdIn(java.util.Collection<String> sessionIds);
}
