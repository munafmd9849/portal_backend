package com.pwioi.portal.repository;

import com.pwioi.portal.entity.CodingProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CodingProfileRepository extends JpaRepository<CodingProfile, String>, JpaSpecificationExecutor<CodingProfile> {
    java.util.Optional<CodingProfile> findByStudentIdAndPlatform(String studentId, String platform);
    java.util.List<CodingProfile> findByStudentId(String studentId);
}
