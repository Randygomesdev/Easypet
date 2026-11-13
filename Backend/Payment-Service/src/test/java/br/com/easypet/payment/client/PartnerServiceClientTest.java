package br.com.easypet.payment.client;

import br.com.easypet.payment.client.dto.ServiceResponseDto;
import br.com.easypet.payment.config.RestTemplateConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PartnerServiceClientTest {
    @Test
    void readsServiceIdsFromInternalProjectionWithOriginalBearer() {
        String partnerServiceUrl = "http://partner.example.test/api/v1";
        UUID partnerId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        var restTemplate = new RestTemplateConfig().restTemplate();
        var partner = new PartnerServiceClient(restTemplate);
        ReflectionTestUtils.setField(partner, "partnerServiceUrl", partnerServiceUrl);
        var server = MockRestServiceServer.bindTo(restTemplate).build();
        String bearer = "Bearer original-operator-token";
        server.expect(requestTo(partnerServiceUrl + "/internal/partners/" + partnerId + "/operations"))
                .andExpect(method(GET))
                .andExpect(header(AUTHORIZATION, bearer))
                .andRespond(withSuccess("""
                        {"id":"%s","name":"Pet da Praça","boardingCapacity":4,"businessHours":[],
                         "services":[{"id":"%s","name":"Banho","price":60,"durationMinutes":45,"billingUnit":"HOURLY"}]}
                        """.formatted(partnerId, serviceId), APPLICATION_JSON));

        var inbound = new MockHttpServletRequest();
        inbound.addHeader(AUTHORIZATION, bearer);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(inbound));
        try {
            var response = partner.getOperations(partnerId);
            assertThat(response.id()).isEqualTo(partnerId);
            assertThat(response.services()).extracting(ServiceResponseDto::id).containsExactly(serviceId);
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
        server.verify();
    }
}
