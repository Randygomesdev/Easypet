package br.com.easypet.partner.mapper;

import br.com.easypet.partner.domain.entity.PartnerReview;
import br.com.easypet.partner.dto.request.ReviewRequest;
import br.com.easypet.partner.dto.response.ReviewResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReviewMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "partner", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "authorName", ignore = true) // definido pelo service via JWT
    PartnerReview toEntity(ReviewRequest request);

    ReviewResponse toResponse(PartnerReview review);
}
