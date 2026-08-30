package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Experience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ExperienceRepository extends JpaRepository<Experience, String>, JpaSpecificationExecutor<Experience> {
    java.util.List<Experience> findByStudentId(String studentId);
}
