package com.pwioi.portal.repository;

import com.pwioi.portal.entity.StudentActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentActivityLogRepository extends JpaRepository<StudentActivityLog, String>, JpaSpecificationExecutor<StudentActivityLog> {
    java.util.List<StudentActivityLog> findByStudentId(String studentId);
}
