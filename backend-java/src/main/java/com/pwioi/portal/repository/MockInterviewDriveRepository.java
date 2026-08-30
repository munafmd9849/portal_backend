package com.pwioi.portal.repository;

import com.pwioi.portal.entity.MockInterviewDrive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MockInterviewDriveRepository extends JpaRepository<MockInterviewDrive, String>, JpaSpecificationExecutor<MockInterviewDrive> {

}
