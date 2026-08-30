package com.pwioi.portal.repository;

import com.pwioi.portal.entity.SuccessStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SuccessStoryRepository extends JpaRepository<SuccessStory, String>, JpaSpecificationExecutor<SuccessStory> {
    java.util.List<SuccessStory> findByStudentId(String studentId);
    java.util.List<SuccessStory> findByCreatedById(String createdById);
    java.util.List<SuccessStory> findByUpdatedById(String updatedById);
}
