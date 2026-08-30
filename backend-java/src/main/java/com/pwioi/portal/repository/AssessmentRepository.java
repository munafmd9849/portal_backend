package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentRepository extends JpaRepository<Assessment, String>, JpaSpecificationExecutor<Assessment> {
    java.util.Optional<Assessment> findByInviteToken(String inviteToken);
    boolean existsByInviteToken(String inviteToken);
}
