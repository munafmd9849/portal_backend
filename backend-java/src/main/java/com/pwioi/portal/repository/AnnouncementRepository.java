package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AnnouncementRepository extends JpaRepository<Announcement, String>, JpaSpecificationExecutor<Announcement> {

}
