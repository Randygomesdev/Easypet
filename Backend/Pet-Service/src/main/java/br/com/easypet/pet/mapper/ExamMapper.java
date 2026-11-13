package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Exam;
import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.model.HistorySource;
import br.com.easypet.pet.dto.request.ExamRequest;
import br.com.easypet.pet.dto.response.ExamResponse;
import org.springframework.stereotype.Component;

@Component
public class ExamMapper {

    public Exam toEntity(ExamRequest request, Pet pet, HistorySource source) {
        return Exam.builder()
                .pet(pet)
                .examName(request.examName())
                .date(request.date())
                .laboratory(request.laboratory())
                .vetName(request.veterinarianName())
                .resultsSummary(request.resultsSummary())
                .fileUrl(request.fileUrl())
                .certified(false)
                .source(source)
                .partnerName(request.partnerName())
                .bookingId(request.bookingId())
                .build();
    }

    public ExamResponse toResponse(Exam entity) {
        return new ExamResponse(
                entity.getId(),
                entity.getExamName(),
                entity.getDate(),
                entity.getLaboratory(),
                entity.getVetName(),
                entity.getResultsSummary(),
                entity.getFileUrl(),
                entity.getCertified(),
                entity.getSource(),
                entity.getPartnerName(),
                entity.getBookingId()
        );
    }
}
