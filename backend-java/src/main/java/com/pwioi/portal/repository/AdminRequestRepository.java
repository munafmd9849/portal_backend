package com.pwioi.portal.repository;

import com.pwioi.portal.entity.AdminRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminRequestRepository extends JpaRepository<AdminRequest, String>, JpaSpecificationExecutor<AdminRequest> {
    java.util.List<AdminRequest> findByUserId(String userId);
}
