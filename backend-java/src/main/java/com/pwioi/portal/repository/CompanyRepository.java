package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CompanyRepository extends JpaRepository<Company, String>, JpaSpecificationExecutor<Company> {
    java.util.Optional<Company> findByName(String name);
    java.util.Optional<Company> findByNameIgnoreCase(String name);
    boolean existsByName(String name);
}
