package br.com.easypet.partner.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeocodingService {

    private final RestClient restClient = RestClient.builder()
            .defaultHeader("User-Agent", "EasyPetMicroservices/1.0 (randygomesdev@github.com)")
            .build();

    public Coordinates geocode(String addressText) {
        try {
            String query = URLEncoder.encode(addressText, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q=" + query + "&format=json&limit=1";
            
            return executeGeocoding(url, addressText);
        } catch (Exception e) {
            log.error("Falha ao consultar a API de Geocoding (Simples): {}", e.getMessage());
        }
        return null;
    }

    /**
     * Realiza uma busca estruturada usando CEP e outros campos.
     * O postalcode (CEP) é o parâmetro mais confiável para endereços brasileiros.
     */
    public Coordinates geocodeStructured(String street, String number, String neighborhood, String city, String state, String zipCode) {
        try {
            String streetParam = (number != null && !number.isBlank()) ? number + " " + street : street;
            
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("https://nominatim.openstreetmap.org/search")
                    .queryParam("street", streetParam)
                    .queryParam("city", city)
                    .queryParam("state", state)
                    .queryParam("country", "Brasil")
                    .queryParam("format", "json")
                    .queryParam("limit", 1);

            // Adicionamos o CEP se disponível, pois aumenta drasticamente a precisão
            if (zipCode != null && !zipCode.isBlank()) {
                builder.queryParam("postalcode", zipCode);
            }

            String url = builder.toUriString();
            String logLabel = String.format("%s, %s, %s (CEP: %s)", streetParam, city, state, zipCode);
            
            return executeGeocoding(url, logLabel);
            
        } catch (Exception e) {
            log.error("Falha ao consultar a API de Geocoding (Estruturado): {}", e.getMessage());
        }
        return null;
    }

    private Coordinates executeGeocoding(String url, String label) {
        log.info("Iniciando chamada HTTP para Nominatim: [{}]", label);
        
        try {
            List<Map<String, Object>> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            if (response != null && !response.isEmpty()) {
                Map<String, Object> location = response.get(0);
                Double lat = Double.parseDouble(location.get("lat").toString());
                Double lon = Double.parseDouble(location.get("lon").toString());
                
                log.info("Sucesso! Coordenadas obtidas: lat={}, lon={}", lat, lon);
                return new Coordinates(lat, lon);
            }
        } catch (Exception e) {
            log.warn("Erro na chamada ao Nominatim para '{}': {}", label, e.getMessage());
        }
        
        log.warn("Nenhum resultado encontrado para: '{}'", label);
        return null;
    }

    public record Coordinates(Double latitude, Double longitude) {}
}
