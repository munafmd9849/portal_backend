package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Endorsement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EndorsementRepository extends JpaRepository<Endorsement, String>, JpaSpecificationExecutor<Endorsement> {
    java.util.Optional<Endorsement> findByTokenId(String tokenId);
    boolean existsByTokenId(String tokenId);
    java.util.List<Endorsement> findByStudentId(String studentId);
}
