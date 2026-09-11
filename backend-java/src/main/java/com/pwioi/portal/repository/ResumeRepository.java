package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ResumeRepository extends JpaRepository<Resume, String>, JpaSpecificationExecutor<Resume> {
    java.util.Optional<Resume> findByUserIdAndResumeId(String userId, String resumeId);
    java.util.List<Resume> findByUserId(String userId);
}
