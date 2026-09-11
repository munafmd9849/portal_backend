package com.pwioi.portal.repository;

import com.pwioi.portal.entity.MockInterviewRecording;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MockInterviewRecordingRepository extends JpaRepository<MockInterviewRecording, String>, JpaSpecificationExecutor<MockInterviewRecording> {

}
