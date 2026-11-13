package br.com.easypet.partner.service;

import br.com.easypet.partner.domain.entity.Partner;
import br.com.easypet.partner.exception.ResourceNotFoundException;
import br.com.easypet.partner.repository.PartnerRepository;
import br.com.easypet.partner.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DeskAccess {
    private final PartnerRepository partners;

    public Partner activePartner(UserPrincipal actor) {
        Optional<Partner> partner = actor.partnerId() == null
                ? partners.findByUserId(UUID.fromString(actor.id()))
                : partners.findById(actor.partnerId());
        return partner.filter(found -> Boolean.TRUE.equals(found.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Nenhum estabelecimento ativo para este usuário."));
    }
}
