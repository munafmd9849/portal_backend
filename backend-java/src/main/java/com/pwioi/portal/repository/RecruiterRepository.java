package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Recruiter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RecruiterRepository extends JpaRepository<Recruiter, String>, JpaSpecificationExecutor<Recruiter> {
    java.util.Optional<Recruiter> findByUserId(String userId);
    boolean existsByUserId(String userId);
    java.util.List<Recruiter> findByCompanyId(String companyId);
}
