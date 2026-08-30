package com.pwioi.portal.repository;

import com.pwioi.portal.entity.StudentQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentQueryRepository extends JpaRepository<StudentQuery, String>, JpaSpecificationExecutor<StudentQuery> {
    java.util.List<StudentQuery> findByStudentId(String studentId);
}
