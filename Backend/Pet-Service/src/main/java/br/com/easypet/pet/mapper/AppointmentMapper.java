package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Appointment;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.HistorySource;
import br.com.easypet.pet.dto.request.AppointmentRequest;
import br.com.easypet.pet.dto.response.AppointmentResponse;
import org.springframework.stereotype.Component;

@Component
public class AppointmentMapper {

    public Appointment toEntity(AppointmentRequest request, Pet pet, HistorySource source) {
        return Appointment.builder()
                .pet(pet)
                .date(request.date())
                .reason(request.reason())
                .clinicalNotes(request.clinicalNotes())
                .vetName(request.vetName())
                .providerId(request.providerId())
                .weightAtTime(request.weightAtTime())
                .status(request.status())
                .certified(false)
                .source(source)
                .partnerName(request.partnerName())
                .bookingId(request.bookingId())
                .build();
    }

    public AppointmentResponse toResponse(Appointment entity) {
        return new AppointmentResponse(
                entity.getId(),
                entity.getDate(),
                entity.getReason(),
                entity.getClinicalNotes(),
                entity.getVetName(),
                entity.getProviderId(),
                entity.getWeightAtTime(),
                entity.getStatus(),
                entity.getCertified(),
                entity.getCreatedAt(),
                entity.getSource(),
                entity.getPartnerName(),
                entity.getBookingId()
        );
    }
}
