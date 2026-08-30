package com.pwioi.portal.repository;

import com.pwioi.portal.entity.CmsSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CmsSectionRepository extends JpaRepository<CmsSection, String>, JpaSpecificationExecutor<CmsSection> {
    java.util.List<CmsSection> findByCreatedById(String createdById);
    java.util.List<CmsSection> findByUpdatedById(String updatedById);
}
