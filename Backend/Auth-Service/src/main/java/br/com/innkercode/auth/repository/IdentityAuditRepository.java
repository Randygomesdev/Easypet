package br.com.innkercode.auth.repository;

import br.com.innkercode.auth.domain.entity.IdentityAuditEvent;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.UUID;

public interface IdentityAuditRepository extends Repository<IdentityAuditEvent, UUID>,
        JpaSpecificationExecutor<IdentityAuditEvent> {

    IdentityAuditEvent save(IdentityAuditEvent event);
}
