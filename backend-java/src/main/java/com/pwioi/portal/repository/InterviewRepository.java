package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterviewRepository extends JpaRepository<Interview, String>, JpaSpecificationExecutor<Interview> {
    java.util.Optional<Interview> findByJobId(String jobId);
    boolean existsByJobId(String jobId);
    java.util.Optional<Interview> findBySessionToken(String sessionToken);
    boolean existsBySessionToken(String sessionToken);
    java.util.List<Interview> findByCompanyId(String companyId);
}
