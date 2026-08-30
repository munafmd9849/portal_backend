package com.pwioi.portal.service;
import com.pwioi.portal.entity.*;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.*;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import java.util.List; import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AcademicService {
    private final SchoolRepository schools; private final CenterRepository centers; private final BatchRepository batches;
    public AcademicService(SchoolRepository schools, CenterRepository centers, BatchRepository batches) {
        this.schools = schools; this.centers = centers; this.batches = batches;
    }
    public List<School> schools() { return schools.findAll(); }
    public List<Center> centers() { return centers.findAll(); }
    public List<Batch> batches() { return batches.findAll(); }
    @Transactional public School createSchool(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        School s = new School(); s.setName(String.valueOf(b.get("name"))); s.setCode(b.get("code")==null?null:b.get("code").toString()); s.setStatus("ACTIVE");
        return schools.save(s);
    }
    @Transactional public School updateSchool(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        School s = schools.findById(id).orElseThrow(() -> ApiException.notFound("School"));
        if (b.get("name")!=null) s.setName(b.get("name").toString());
        if (b.get("status")!=null) s.setStatus(b.get("status").toString());
        return schools.save(s);
    }
    @Transactional public void deleteSchool(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); schools.deleteById(id); }
    @Transactional public Center createCenter(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Center c = new Center(); c.setName(String.valueOf(b.get("name"))); c.setLocation(b.get("location")==null?null:b.get("location").toString()); c.setStatus("ACTIVE");
        return centers.save(c);
    }
    @Transactional public Center updateCenter(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Center c = centers.findById(id).orElseThrow(() -> ApiException.notFound("Center"));
        if (b.get("name")!=null) c.setName(b.get("name").toString());
        return centers.save(c);
    }
    @Transactional public void deleteCenter(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); centers.deleteById(id); }
    @Transactional public Batch createBatch(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Batch x = new Batch(); x.setYear(String.valueOf(b.get("year"))); x.setLabel(b.get("label")==null?null:b.get("label").toString()); x.setStatus("ACTIVE");
        return batches.save(x);
    }
    @Transactional public Batch updateBatch(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Batch x = batches.findById(id).orElseThrow(() -> ApiException.notFound("Batch"));
        if (b.get("year")!=null) x.setYear(b.get("year").toString());
        return batches.save(x);
    }
    @Transactional public void deleteBatch(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); batches.deleteById(id); }
}
