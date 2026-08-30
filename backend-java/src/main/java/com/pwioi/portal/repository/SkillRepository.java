package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SkillRepository extends JpaRepository<Skill, String>, JpaSpecificationExecutor<Skill> {
    java.util.Optional<Skill> findByStudentIdAndSkillName(String studentId, String skillName);
    java.util.List<Skill> findByStudentId(String studentId);
    java.util.List<Skill> findByStudentIdOrderBySkillNameAsc(String studentId);
}
