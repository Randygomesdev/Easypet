package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Appointment;
import br.com.easypet.pet.domain.entity.Medication;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.HistorySource;
import br.com.easypet.pet.dto.request.MedicationRequest;
import br.com.easypet.pet.dto.response.MedicationResponse;
import org.springframework.stereotype.Component;

@Component
public class MedicationMapper {

    public Medication toEntity(MedicationRequest request, Pet pet, Appointment appointment, HistorySource source) {
        return Medication.builder()
                .pet(pet)
                .appointment(appointment)
                .name(request.name())
                .dosage(request.dosage())
                .frequency(request.frequency())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .observations(request.observations())
                .active(request.active())
                .source(source)
                .partnerName(request.partnerName())
                .bookingId(request.bookingId())
                .build();
    }

    public MedicationResponse toResponse(Medication entity) {
        return new MedicationResponse(
                entity.getId(),
                entity.getName(),
                entity.getDosage(),
                entity.getFrequency(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getObservations(),
                entity.getActive(),
                entity.getAppointment() != null ? entity.getAppointment().getId() : null,
                entity.getSource(),
                entity.getPartnerName(),
                entity.getBookingId()
        );
    }
}
