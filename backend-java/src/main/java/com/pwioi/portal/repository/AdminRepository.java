package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminRepository extends JpaRepository<Admin, String>, JpaSpecificationExecutor<Admin> {
    java.util.Optional<Admin> findByUserId(String userId);
    boolean existsByUserId(String userId);
}
