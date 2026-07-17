package br.com.easypet.partner.controller;

import br.com.easypet.partner.domain.model.StaffStatus;
import br.com.easypet.partner.dto.request.StaffRequest;
import br.com.easypet.partner.dto.request.StaffScheduleRequest;
import br.com.easypet.partner.dto.request.StaffAbsenceRequest;
import br.com.easypet.partner.dto.response.StaffResponse;
import br.com.easypet.partner.dto.response.StaffScheduleResponse;
import br.com.easypet.partner.dto.response.StaffAbsenceResponse;
import br.com.easypet.partner.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/partners")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Staff", description = "Endpoints para gestão de profissionais, escalas e ausências da equipe dos parceiros")
public class StaffController {

    private final StaffService staffService;

    @PostMapping("/{partnerId}/staff")
    @Operation(summary = "Cadastrar um novo profissional no parceiro", description = "Cria um novo membro de equipe e o associa a serviços. Requer role ADMIN.")
    public ResponseEntity<StaffResponse> createStaff(
            @PathVariable(name = "partnerId") UUID partnerId,
            @Valid @RequestBody StaffRequest request) {
        log.info("Recebida requisição para cadastrar profissional '{}' no parceiro ID: {}", request.name(), partnerId);
        StaffResponse response = staffService.createStaff(partnerId, request);
        URI uri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/partners/staff/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping("/{partnerId}/staff")
    @Operation(summary = "Listar profissionais de um parceiro", description = "Lista profissionais da equipe de um parceiro, com filtros opcionais de status e especialidade.")
    public ResponseEntity<List<StaffResponse>> getStaff(
            @PathVariable(name = "partnerId") UUID partnerId,
            @RequestParam(name = "status", required = false) StaffStatus status,
            @RequestParam(name = "serviceId", required = false) UUID serviceId) {
        log.info("Recebida requisição para listar profissionais do parceiro ID: {}, status: {}, serviceId: {}", partnerId, status, serviceId);
        List<StaffResponse> response = staffService.getStaffByPartnerId(partnerId, status, serviceId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/staff/{staffId}")
    @Operation(summary = "Buscar profissional por ID", description = "Retorna detalhes e especialidades de um profissional específico.")
    public ResponseEntity<StaffResponse> getStaffById(@PathVariable(name = "staffId") UUID staffId) {
        log.info("Recebida requisição para buscar profissional ID: {}", staffId);
        StaffResponse response = staffService.getStaffById(staffId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/staff/{staffId}")
    @Operation(summary = "Atualizar profissional", description = "Atualiza os dados de perfil e especialidades do profissional. Requer role ADMIN.")
    public ResponseEntity<StaffResponse> updateStaff(
            @PathVariable(name = "staffId") UUID staffId,
            @Valid @RequestBody StaffRequest request) {
        log.info("Recebida requisição para atualizar profissional ID: {}", staffId);
        StaffResponse response = staffService.updateStaff(staffId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/staff/{staffId}")
    @Operation(summary = "Excluir/Inativar profissional", description = "Inativa temporariamente um profissional para preservar dados históricos de agendamentos. Requer role ADMIN.")
    public ResponseEntity<Void> deleteStaff(@PathVariable(name = "staffId") UUID staffId) {
        log.info("Recebida requisição para inativar profissional ID: {}", staffId);
        staffService.deleteStaff(staffId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/staff/{staffId}/schedule")
    @Operation(summary = "Configurar grade horária semanal", description = "Define a escala de expediente semanal regular do profissional. Requer role ADMIN.")
    public ResponseEntity<List<StaffScheduleResponse>> updateSchedule(
            @PathVariable(name = "staffId") UUID staffId,
            @Valid @RequestBody List<StaffScheduleRequest> request) {
        log.info("Recebida requisição para configurar escala do profissional ID: {}", staffId);
        List<StaffScheduleResponse> response = staffService.updateStaffSchedule(staffId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/staff/{staffId}/schedule")
    @Operation(summary = "Consultar grade horária semanal", description = "Retorna a escala horária regular configurada para o profissional.")
    public ResponseEntity<List<StaffScheduleResponse>> getSchedule(@PathVariable(name = "staffId") UUID staffId) {
        log.info("Recebida requisição para consultar escala do profissional ID: {}", staffId);
        List<StaffScheduleResponse> response = staffService.getStaffSchedule(staffId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/staff/{staffId}/absences")
    @Operation(summary = "Cadastrar ausência/férias", description = "Registra um período específico de ausência que bloqueará a agenda regular. Requer role ADMIN.")
    public ResponseEntity<StaffAbsenceResponse> createAbsence(
            @PathVariable(name = "staffId") UUID staffId,
            @Valid @RequestBody StaffAbsenceRequest request) {
        log.info("Recebida requisição para cadastrar ausência do profissional ID: {}", staffId);
        StaffAbsenceResponse response = staffService.createStaffAbsence(staffId, request);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping("/staff/{staffId}/absences")
    @Operation(summary = "Consultar ausências/férias", description = "Retorna a lista de ausências temporárias cadastradas para o profissional.")
    public ResponseEntity<List<StaffAbsenceResponse>> getAbsences(@PathVariable(name = "staffId") UUID staffId) {
        log.info("Recebida requisição para consultar ausências do profissional ID: {}", staffId);
        List<StaffAbsenceResponse> response = staffService.getStaffAbsences(staffId);
        return ResponseEntity.ok(response);
    }
}
