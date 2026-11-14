package br.com.easypet.booking.mapper;

import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.dto.request.BookingRequest;
import br.com.easypet.booking.dto.response.BookingResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface BookingMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "receptionCustomerId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "customerPackageId", ignore = true)
    @Mapping(target = "isFittingRequest", ignore = true)
    @Mapping(target = "scheduledEnd", ignore = true)
    @Mapping(target = "cancellationReason", ignore = true)
    @Mapping(target = "noShowReason", ignore = true)
    @Mapping(target = "interruptionReason", ignore = true)
    @Mapping(target = "interruptedAt", ignore = true)
    @Mapping(target = "interruptedBy", ignore = true)
    @Mapping(target = "readyAt", ignore = true)
    @Mapping(target = "eventVersion", ignore = true)
    Booking toEntity(BookingRequest request);

    BookingResponse toResponse(Booking booking);

    List<BookingResponse> toResponseList(List<Booking> bookings);

}
