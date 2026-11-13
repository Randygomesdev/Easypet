package br.com.easypet.booking.client;

import br.com.easypet.booking.client.dto.PartnerResponseDto;
import br.com.easypet.booking.exception.BookingUnavailableException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PartnerServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.partner-service.url:http://localhost:8083/api/v1}")
    private String partnerServiceUrl;

    private record PartnerIdentity(UUID id) {}

    private record DeskIdentity(UUID partnerId) {}

    public record StaffAssignment(UUID partnerId, UUID userId, UUID staffId) {}
    public record CustomerClaim(UUID customerId, UUID partnerId) {}

    public StaffAssignment getStaffAssignment(UUID partnerId, UUID userId) {
        try {
            var assignment = restTemplate.getForObject(partnerServiceUrl + "/internal/partners/me/staff-assignment",
                    StaffAssignment.class);
            if (assignment == null || assignment.staffId() == null || !partnerId.equals(assignment.partnerId())
                    || !userId.equals(assignment.userId())) {
                throw new BookingUnavailableException("Não foi possível verificar o vínculo com a escala.");
            }
            return assignment;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Vínculo profissional não encontrado.");
        } catch (RestClientException ex) {
            throw new BookingUnavailableException("Não foi possível verificar o vínculo com a escala.", ex);
        }
    }

    public List<CustomerClaim> getCustomerClaims() {
        try {
            var claims = restTemplate.getForObject(partnerServiceUrl + "/internal/partners/customer-claims/me",
                    CustomerClaim[].class);
            if (claims == null || java.util.Arrays.stream(claims)
                    .anyMatch(claim -> claim == null || claim.partnerId() == null || claim.customerId() == null)) {
                throw new BookingUnavailableException("Não foi possível verificar os cadastros vinculados.");
            }
            return List.of(claims);
        } catch (RestClientException ex) {
            throw new BookingUnavailableException("Não foi possível verificar os cadastros vinculados.", ex);
        }
    }

    public UUID getCurrentPartnerId() {
        try {
            PartnerIdentity partner = restTemplate.getForObject(partnerServiceUrl + "/partners/me", PartnerIdentity.class);
            if (partner != null && partner.id() != null) {
                return partner.id();
            }
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResourceNotFoundException("Estabelecimento do usuário não encontrado.");
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar o estabelecimento. Tente novamente.", e);
        }
        throw new ResourceNotFoundException("Estabelecimento do usuário não encontrado.");
    }

    public void requireActiveDesk(UUID partnerId) {
        try {
            var desk = restTemplate.getForObject(partnerServiceUrl + "/partners/me/desk", DeskIdentity.class);
            if (desk == null || !partnerId.equals(desk.partnerId())) {
                throw new BookingUnavailableException("Não foi possível verificar o estabelecimento de balcão.");
            }
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Estabelecimento não encontrado.");
        } catch (HttpClientErrorException.Forbidden ex) {
            throw new org.springframework.security.access.AccessDeniedException("Acesso ao balcão não permitido.");
        } catch (RestClientException ex) {
            throw new BookingUnavailableException("Não foi possível verificar o estabelecimento de balcão.", ex);
        }
    }

    public PartnerResponseDto getOperations(UUID partnerId) {
        try {
            PartnerResponseDto partner = restTemplate.getForObject(
                    partnerServiceUrl + "/internal/partners/{partnerId}/operations", PartnerResponseDto.class, partnerId);
            if (partner == null || !partnerId.equals(partner.id())) {
                throw new BookingUnavailableException("Não foi possível consultar o estabelecimento. Tente novamente.");
            }
            return partner;
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Parceiro ID {} não encontrado no partner-service", partnerId);
            throw new ResourceNotFoundException("Parceiro não encontrado com o ID: " + partnerId);
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar o estabelecimento. Tente novamente.", e);
        }
    }

    public List<br.com.easypet.booking.client.dto.StaffResponseDto> getStaffByPartnerId(UUID partnerId, UUID serviceId) {
        String url = partnerServiceUrl + "/internal/partners/" + partnerId + "/staff";
        if (serviceId != null) {
            url += "?serviceId=" + serviceId;
        }
        log.info("Buscando profissionais síncronos no partner-service: {}", url);
        try {
            br.com.easypet.booking.client.dto.StaffResponseDto[] response = restTemplate.getForObject(url, br.com.easypet.booking.client.dto.StaffResponseDto[].class);
            return response != null ? List.of(response) : List.of();
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar os profissionais. Tente novamente.", e);
        }
    }

    public List<br.com.easypet.booking.client.dto.StaffScheduleResponseDto> getStaffSchedule(UUID staffId) {
        String url = partnerServiceUrl + "/internal/partners/staff/" + staffId + "/schedule";
        log.info("Buscando grade horária do profissional no partner-service: {}", url);
        try {
            br.com.easypet.booking.client.dto.StaffScheduleResponseDto[] response = restTemplate.getForObject(url, br.com.easypet.booking.client.dto.StaffScheduleResponseDto[].class);
            return response != null ? List.of(response) : List.of();
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar a escala. Tente novamente.", e);
        }
    }

    public List<br.com.easypet.booking.client.dto.StaffAbsenceResponseDto> getStaffAbsences(UUID staffId) {
        String url = partnerServiceUrl + "/internal/partners/staff/" + staffId + "/absences";
        log.info("Buscando ausências do profissional no partner-service: {}", url);
        try {
            br.com.easypet.booking.client.dto.StaffAbsenceResponseDto[] response = restTemplate.getForObject(url, br.com.easypet.booking.client.dto.StaffAbsenceResponseDto[].class);
            return response != null ? List.of(response) : List.of();
        } catch (RestClientException e) {
            throw new BookingUnavailableException("Não foi possível consultar as ausências. Tente novamente.", e);
        }
    }
}
