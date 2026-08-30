package com.pwioi.portal.repository;

import com.pwioi.portal.entity.CmsVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CmsVersionRepository extends JpaRepository<CmsVersion, String>, JpaSpecificationExecutor<CmsVersion> {
    java.util.Optional<CmsVersion> findByPageSlugAndVersion(String pageSlug, Integer version);
    java.util.List<CmsVersion> findByCreatedById(String createdById);
}
