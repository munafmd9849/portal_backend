package com.pwioi.portal.repository;

import com.pwioi.portal.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentRepository extends JpaRepository<Student, String>, JpaSpecificationExecutor<Student> {
    java.util.Optional<Student> findByUserId(String userId);
    boolean existsByUserId(String userId);
    java.util.Optional<Student> findByEmail(String email);
    boolean existsByEmail(String email);
    java.util.Optional<Student> findByEnrollmentId(String enrollmentId);
    boolean existsByEnrollmentId(String enrollmentId);
    java.util.Optional<Student> findByPublicProfileId(String publicProfileId);
    boolean existsByPublicProfileId(String publicProfileId);
    java.util.List<Student> findByBatchId(String batchId);
    java.util.List<Student> findByCenterId(String centerId);
    java.util.List<Student> findBySchoolId(String schoolId);
}
