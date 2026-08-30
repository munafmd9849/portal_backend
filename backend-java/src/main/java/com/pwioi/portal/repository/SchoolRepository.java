package com.pwioi.portal.repository;

import com.pwioi.portal.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SchoolRepository extends JpaRepository<School, String>, JpaSpecificationExecutor<School> {
    java.util.Optional<School> findByName(String name);
    boolean existsByName(String name);
    java.util.Optional<School> findByCode(String code);
    boolean existsByCode(String code);
}
