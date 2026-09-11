package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ApplicationRepository extends JpaRepository<Application, String>, JpaSpecificationExecutor<Application> {
    java.util.Optional<Application> findByStudentIdAndJobId(String studentId, String jobId);
    java.util.List<Application> findByStudentId(String studentId);
    java.util.List<Application> findByStudentIdOrderByAppliedDateDesc(String studentId);
    java.util.List<Application> findByJobId(String jobId);
    java.util.List<Application> findByCompanyId(String companyId);
    long countByJobIdIn(java.util.Collection<String> jobIds);
}
