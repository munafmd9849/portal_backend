package com.pwioi.portal.repository;

import com.pwioi.portal.entity.JobTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JobTargetRepository extends JpaRepository<JobTarget, String>, JpaSpecificationExecutor<JobTarget> {
    java.util.Optional<JobTarget> findByJobIdAndStudentId(String jobId, String studentId);
    java.util.List<JobTarget> findByJobId(String jobId);
    java.util.List<JobTarget> findByStudentId(String studentId);
    long countByJobIdIn(java.util.Collection<String> jobIds);
}
