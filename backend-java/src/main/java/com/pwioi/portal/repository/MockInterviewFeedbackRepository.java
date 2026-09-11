package com.pwioi.portal.repository;

import com.pwioi.portal.entity.MockInterviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MockInterviewFeedbackRepository extends JpaRepository<MockInterviewFeedback, String>, JpaSpecificationExecutor<MockInterviewFeedback> {
    java.util.Optional<MockInterviewFeedback> findBySlotId(String slotId);
    boolean existsBySlotId(String slotId);
}
