package com.pwioi.portal.repository;

import com.pwioi.portal.entity.RoundEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RoundEvaluationRepository extends JpaRepository<RoundEvaluation, String>, JpaSpecificationExecutor<RoundEvaluation> {
    java.util.Optional<RoundEvaluation> findByRoundIdAndApplicationId(String roundId, String applicationId);
    java.util.List<RoundEvaluation> findByRoundId(String roundId);
    java.util.List<RoundEvaluation> findByApplicationId(String applicationId);
    java.util.List<RoundEvaluation> findByApplicationIdIn(java.util.Collection<String> applicationIds);
}
