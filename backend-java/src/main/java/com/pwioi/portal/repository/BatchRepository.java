package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BatchRepository extends JpaRepository<Batch, String>, JpaSpecificationExecutor<Batch> {
    java.util.Optional<Batch> findByYear(String year);
    boolean existsByYear(String year);
}
