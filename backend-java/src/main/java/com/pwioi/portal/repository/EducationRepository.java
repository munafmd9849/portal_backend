package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Education;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EducationRepository extends JpaRepository<Education, String>, JpaSpecificationExecutor<Education> {
    java.util.List<Education> findByStudentId(String studentId);
}
