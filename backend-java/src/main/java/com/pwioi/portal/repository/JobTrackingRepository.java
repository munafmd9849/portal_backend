package com.pwioi.portal.repository;

import com.pwioi.portal.entity.JobTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JobTrackingRepository extends JpaRepository<JobTracking, String>, JpaSpecificationExecutor<JobTracking> {
    java.util.Optional<JobTracking> findByStudentIdAndJobId(String studentId, String jobId);
    java.util.List<JobTracking> findByStudentId(String studentId);
    java.util.List<JobTracking> findByJobId(String jobId);
}
