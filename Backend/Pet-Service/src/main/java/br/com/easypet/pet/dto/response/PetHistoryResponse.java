package br.com.easypet.pet.dto.response;

import java.util.List;

public record PetHistoryResponse(
    List<AppointmentResponse> appointments,
    List<MedicationResponse> medications,
    List<ExamResponse> exams,
    List<VaccineResponse> vaccines
) {}
