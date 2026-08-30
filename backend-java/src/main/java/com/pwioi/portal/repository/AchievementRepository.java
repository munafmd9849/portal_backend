package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AchievementRepository extends JpaRepository<Achievement, String>, JpaSpecificationExecutor<Achievement> {
    java.util.List<Achievement> findByStudentId(String studentId);
}
