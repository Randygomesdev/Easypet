package br.com.easypet.booking.service;

import br.com.easypet.booking.dto.response.PartnerIntegrationResponse;
import br.com.easypet.booking.exception.BusinessException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PartnerIntegrationService {

    private final RestTemplate restTemplate;
    
    @Value("${services.partner-service.url:http://localhost:8083/api/v1}")
    private String partnerServiceUrl;

    public PartnerIntegrationResponse getPartnerDetails(UUID partnerId) {
        log.info("Buscando detalhes do parceiro {} no partner-service", partnerId);
        try {
            PartnerIntegrationResponse partner = restTemplate.getForObject(
                    partnerServiceUrl + "/partners/{id}", PartnerIntegrationResponse.class, partnerId);
            if (partner == null) {
                throw new BusinessException("Não foi possível consultar os horários do estabelecimento.");
            }
            return partner;
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResourceNotFoundException("Estabelecimento não encontrado.");
        } catch (RestClientException e) {
            log.warn("Erro ao obter detalhes do parceiro {}: {}", partnerId, e.getMessage());
            throw new BusinessException("Não foi possível consultar os horários do estabelecimento.");
        }
    }
}
