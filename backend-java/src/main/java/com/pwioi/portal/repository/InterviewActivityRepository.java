package com.pwioi.portal.repository;

import com.pwioi.portal.entity.InterviewActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewActivityRepository extends JpaRepository<InterviewActivity, String>, JpaSpecificationExecutor<InterviewActivity> {
    java.util.List<InterviewActivity> findByInterviewId(String interviewId);
    java.util.List<InterviewActivity> findByStudentId(String studentId);
}
