package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProjectRepository extends JpaRepository<Project, String>, JpaSpecificationExecutor<Project> {
    java.util.List<Project> findByStudentId(String studentId);
}
