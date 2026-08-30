package com.pwioi.portal.repository;

import com.pwioi.portal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {
    java.util.Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    java.util.List<User> findByRole(String role);
    java.util.List<User> findByRoleOrderByCreatedAtDesc(String role);
    java.util.List<User> findByRoleAndStatus(String role, String status);
}
