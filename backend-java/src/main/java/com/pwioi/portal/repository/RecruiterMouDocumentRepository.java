package com.pwioi.portal.repository;

import com.pwioi.portal.entity.RecruiterMouDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RecruiterMouDocumentRepository extends JpaRepository<RecruiterMouDocument, String>, JpaSpecificationExecutor<RecruiterMouDocument> {
    java.util.List<RecruiterMouDocument> findByRecruiterId(String recruiterId);
}
