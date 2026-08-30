package com.pwioi.portal.repository;

import com.pwioi.portal.entity.StudentResumeFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentResumeFileRepository extends JpaRepository<StudentResumeFile, String>, JpaSpecificationExecutor<StudentResumeFile> {
    java.util.List<StudentResumeFile> findByStudentId(String studentId);
    java.util.List<StudentResumeFile> findByUserId(String userId);
}
