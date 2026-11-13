package br.com.easypet.payment.client;

import br.com.easypet.payment.client.dto.PartnerResponseDto;
import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PartnerServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.partner-service.url:http://localhost:8083/api/v1}")
    private String partnerServiceUrl;

    public PartnerResponseDto getOperations(UUID partnerId) {
        String url = partnerServiceUrl + "/internal/partners/" + partnerId + "/operations";
        log.info("Buscando dados do parceiro síncrono no partner-service via client do payment-service: {}", url);
        try {
            return restTemplate.getForObject(url, PartnerResponseDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Parceiro ID {} não encontrado no partner-service", partnerId);
            throw new ResourceNotFoundException("Parceiro não encontrado com o ID: " + partnerId);
        } catch (Exception e) {
            log.error("Erro ao chamar partner-service no endpoint {}: {}", url, e.getMessage(), e);
            throw new BusinessException("Erro de comunicação com o serviço de parceiros.");
        }
    }
}
