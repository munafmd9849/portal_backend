package com.pwioi.portal.repository;

import com.pwioi.portal.entity.MockInterviewSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MockInterviewSlotRepository extends JpaRepository<MockInterviewSlot, String>, JpaSpecificationExecutor<MockInterviewSlot> {
    java.util.Optional<MockInterviewSlot> findByMeetingRoomId(String meetingRoomId);
    boolean existsByMeetingRoomId(String meetingRoomId);
    java.util.List<MockInterviewSlot> findByDriveId(String driveId);
    java.util.List<MockInterviewSlot> findByStudentId(String studentId);
}
