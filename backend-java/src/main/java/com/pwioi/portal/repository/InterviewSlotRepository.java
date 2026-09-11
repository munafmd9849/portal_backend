package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewSlotRepository extends JpaRepository<InterviewSlot, String>, JpaSpecificationExecutor<InterviewSlot> {
    java.util.List<InterviewSlot> findBySessionId(String sessionId);
    java.util.List<InterviewSlot> findByApplicationId(String applicationId);
    java.util.List<InterviewSlot> findByApplicationIdIn(java.util.Collection<String> applicationIds);
    java.util.List<InterviewSlot> findByRoundId(String roundId);
}
