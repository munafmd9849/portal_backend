package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Center;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CenterRepository extends JpaRepository<Center, String>, JpaSpecificationExecutor<Center> {
    java.util.Optional<Center> findByName(String name);
    boolean existsByName(String name);
}
