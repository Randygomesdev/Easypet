package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Appointment;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.dto.request.AppointmentRequest;
import br.com.easypet.pet.dto.response.AppointmentResponse;
import org.springframework.stereotype.Component;

@Component
public class AppointmentMapper {

    public Appointment toEntity(AppointmentRequest request, Pet pet) {
        return Appointment.builder()
                .pet(pet)
                .date(request.date())
                .reason(request.reason())
                .clinicalNotes(request.clinicalNotes())
                .vetName(request.vetName())
                .providerId(request.providerId())
                .weightAtTime(request.weightAtTime())
                .status(request.status())
                .certified(false) // Padrão falso para entrada manual
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
                entity.getCreatedAt()
        );
    }
}
