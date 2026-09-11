package com.pwioi.portal.repository;

import com.pwioi.portal.entity.SearchIndexMeta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SearchIndexMetaRepository extends JpaRepository<SearchIndexMeta, String>, JpaSpecificationExecutor<SearchIndexMeta> {
    java.util.Optional<SearchIndexMeta> findByEntityTypeAndEntityId(String entityType, String entityId);
}
