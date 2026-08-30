package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AiMockInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiMockInterviewRepository extends JpaRepository<AiMockInterview, String>, JpaSpecificationExecutor<AiMockInterview> {

}
