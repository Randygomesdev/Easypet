package br.com.easypet.pet.mapper;

import br.com.easypet.pet.domain.entity.Pet;
import br.com.easypet.pet.domain.entity.WeightRecord;
import br.com.easypet.pet.dto.request.WeightRecordRequest;
import br.com.easypet.pet.dto.response.WeightRecordResponse;
import org.springframework.stereotype.Component;

@Component
public class WeightRecordMapper {

    public WeightRecord toEntity(WeightRecordRequest request, Pet pet) {
        return WeightRecord.builder()
                .pet(pet)
                .date(request.date())
                .weight(request.weight())
                .build();
    }

    public WeightRecordResponse toResponse(WeightRecord record) {
        return new WeightRecordResponse(
                record.getId(),
                record.getDate(),
                record.getWeight()
        );
    }
}
