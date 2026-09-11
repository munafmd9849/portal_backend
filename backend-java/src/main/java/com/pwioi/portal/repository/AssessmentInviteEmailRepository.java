package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AssessmentInviteEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssessmentInviteEmailRepository extends JpaRepository<AssessmentInviteEmail, String>, JpaSpecificationExecutor<AssessmentInviteEmail> {
    java.util.Optional<AssessmentInviteEmail> findByAssessmentIdAndEmail(String assessmentId, String email);
    java.util.List<AssessmentInviteEmail> findByAssessmentId(String assessmentId);
    java.util.List<AssessmentInviteEmail> findByStudentId(String studentId);
}
