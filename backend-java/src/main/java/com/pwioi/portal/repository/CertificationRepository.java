package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Certification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CertificationRepository extends JpaRepository<Certification, String>, JpaSpecificationExecutor<Certification> {
    java.util.List<Certification> findByStudentId(String studentId);
}
