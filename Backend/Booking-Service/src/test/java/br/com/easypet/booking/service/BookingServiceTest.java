package br.com.easypet.booking.service;

import br.com.easypet.booking.client.PartnerServiceClient;
import br.com.easypet.booking.client.PetServiceClient;
import br.com.easypet.booking.client.dto.PartnerResponseDto;
import br.com.easypet.booking.client.dto.ServiceResponseDto;
import br.com.easypet.booking.domain.entity.Booking;
import br.com.easypet.booking.domain.enums.BookingStatus;
import br.com.easypet.booking.domain.enums.BookingType;
import br.com.easypet.booking.domain.enums.BillingUnit;
import br.com.easypet.booking.dto.request.BookingRequest;
import br.com.easypet.booking.dto.response.BookingResponse;
import br.com.easypet.booking.exception.BusinessException;
import br.com.easypet.booking.exception.ResourceNotFoundException;
import br.com.easypet.booking.mapper.BookingMapper;
import br.com.easypet.booking.repository.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingMapper bookingMapper;

    @Mock
    private PartnerServiceClient partnerServiceClient;

    @Mock
    private PetServiceClient petServiceClient;

    @InjectMocks
    private BookingService bookingService;

    private UUID petId;
    private UUID partnerId;
    private UUID userId;
    private UUID serviceId;

    @BeforeEach
    void setUp() {
        petId = UUID.randomUUID();
        partnerId = UUID.randomUUID();
        userId = UUID.randomUUID();
        serviceId = UUID.randomUUID();

        authenticateAs("CUSTOMER");
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "fixture", userId.toString(), List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Test
    void partnerCannotChangeAnotherPartnersBookingEvenIfTheyOwnThePet() {
        authenticateAs("PARTNER");
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .id(bookingId).partnerId(partnerId).userId(userId).status(BookingStatus.PENDING).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(UUID.randomUUID());

        assertThrows(ResourceNotFoundException.class,
                () -> bookingService.updateStatus(bookingId, BookingStatus.COMPLETED));
        assertEquals(BookingStatus.PENDING, booking.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void partnerCannotListAnotherPartnersBookings() {
        authenticateAs("PARTNER");
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(UUID.randomUUID());

        assertThrows(ResourceNotFoundException.class,
                () -> bookingService.getBookingsByPartnerId(partnerId, Pageable.unpaged()));
        verifyNoInteractions(bookingRepository);
    }

    @Test
    void partnerCanChangeStatusOfBookingAtTheirEstablishment() {
        authenticateAs("PARTNER");
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .id(bookingId).partnerId(partnerId).userId(UUID.randomUUID()).status(BookingStatus.PENDING).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(partnerId);
        when(bookingRepository.save(booking)).thenReturn(booking);

        bookingService.updateStatus(bookingId, BookingStatus.CONFIRMED);

        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        verify(bookingRepository).save(booking);
    }

    @Test
    void cancelledBookingCannotBeReopenedToRegainPetAccess() {
        authenticateAs("PARTNER");
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder().id(bookingId).partnerId(partnerId).status(BookingStatus.CANCELLED).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(partnerId);

        assertThrows(BusinessException.class, () -> bookingService.updateStatus(bookingId, BookingStatus.CONFIRMED));
        assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void partnerCannotAttachAnUnrelatedPetToTheirBooking() {
        authenticateAs("PARTNER");
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder().id(bookingId).partnerId(partnerId).petId(petId).build();
        BookingRequest request = new BookingRequest(
                UUID.randomUUID(), partnerId, LocalDateTime.now(), BookingType.GROOMING, null,
                BigDecimal.TEN, null, null, serviceId, null, null, null, null);
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(partnerId);

        assertThrows(BusinessException.class, () -> bookingService.updateBooking(bookingId, request));
        verifyNoInteractions(bookingMapper);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void petAccessRequiresMatchingPartnerAndOwnerOnNonCancelledBooking() {
        authenticateAs("PARTNER");
        when(partnerServiceClient.getCurrentPartnerId()).thenReturn(partnerId);
        when(bookingRepository.existsByPetIdAndUserIdAndPartnerIdAndStatusNot(
                petId, userId, partnerId, BookingStatus.CANCELLED)).thenReturn(true);

        assertTrue(bookingService.hasPetAccess(petId, userId));
        assertFalse(bookingService.hasPetAccess(petId, UUID.randomUUID()));
    }

    @Test
    void createBooking_ShouldSucceed_WhenOrdinaryGroomingBooking() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime bookingDate = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);
        BookingRequest request = new BookingRequest(
                petId, partnerId, bookingDate, BookingType.GROOMING, "Banho cheiroso",
                BigDecimal.valueOf(80.00), null, null, serviceId, null, null, null, null
        );

        Booking booking = new Booking();
        booking.setPetId(petId);
        booking.setPartnerId(partnerId);
        booking.setBookingDate(bookingDate);
        booking.setType(BookingType.GROOMING);
        booking.setNotes("Banho cheiroso");
        booking.setPrice(BigDecimal.valueOf(80.00));

        UUID staffId = UUID.randomUUID();
        br.com.easypet.booking.client.dto.StaffResponseDto staffDto = new br.com.easypet.booking.client.dto.StaffResponseDto(
                staffId, partnerId, "Natalia", null, "ACTIVE", List.of(serviceId)
        );

        int targetDay = bookingDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY ? 1 : bookingDate.getDayOfWeek().getValue() + 1;
        br.com.easypet.booking.client.dto.StaffScheduleResponseDto scheduleDto = new br.com.easypet.booking.client.dto.StaffScheduleResponseDto(
                UUID.randomUUID(), staffId, targetDay, java.time.LocalTime.of(8, 0), java.time.LocalTime.of(18, 0)
        );

        BookingResponse expectedResponse = new BookingResponse(
                UUID.randomUUID(), petId, partnerId, userId, bookingDate, BookingType.GROOMING,
                BookingStatus.PENDING, "Banho cheiroso", BigDecimal.valueOf(80.00),
                null, null, serviceId, LocalDateTime.now(), LocalDateTime.now(), br.com.easypet.booking.domain.enums.PaymentMethod.CARD, null, staffId, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(booking);
        when(partnerServiceClient.getStaffByPartnerId(partnerId, serviceId)).thenReturn(List.of(staffDto));
        when(partnerServiceClient.getStaffAbsences(staffId)).thenReturn(List.of());
        when(partnerServiceClient.getStaffSchedule(staffId)).thenReturn(List.of(scheduleDto));
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);
        when(bookingMapper.toResponse(any(Booking.class))).thenReturn(expectedResponse);

        // Act
        BookingResponse actualResponse = bookingService.createBooking(request);

        // Assert
        assertNotNull(actualResponse);
        assertEquals(BookingType.GROOMING, actualResponse.type());
        assertEquals(BigDecimal.valueOf(80.00), actualResponse.price());
        verify(bookingRepository, times(1)).save(booking);
    }

    @Test
    void createBooking_ShouldThrowException_WhenOrdinaryBookingMissingBookingDate() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        BookingRequest request = new BookingRequest(
                petId, partnerId, null, BookingType.GROOMING, "Banho",
                BigDecimal.valueOf(80.00), null, null, serviceId, null, null, null, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(new Booking());

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> bookingService.createBooking(request));
        assertEquals("A data do agendamento é obrigatória.", exception.getMessage());
    }

    @Test
    void createBooking_ShouldSucceed_WhenBoardingBookingWithinCapacity() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime checkIn = LocalDateTime.now().plusDays(1);
        LocalDateTime checkOut = LocalDateTime.now().plusDays(4); // 3 diárias
        BookingRequest request = new BookingRequest(
                petId, partnerId, null, BookingType.BOARDING, "Hospedagem 3 noites",
                BigDecimal.valueOf(150.00), checkIn, checkOut, serviceId, null, null, null, null
        );

        Booking booking = new Booking();
        booking.setPetId(petId);
        booking.setPartnerId(partnerId);
        booking.setType(BookingType.BOARDING);
        booking.setCheckIn(checkIn);
        booking.setCheckOut(checkOut);
        booking.setServiceId(serviceId);

        ServiceResponseDto serviceDto = new ServiceResponseDto(serviceId, "Hotel Padrão", "Diária de Hotel", BigDecimal.valueOf(50.00), null, BillingUnit.DAILY);
        PartnerResponseDto partnerDto = new PartnerResponseDto(partnerId, "Pet Paradise", 5, List.of(serviceDto));

        when(bookingMapper.toEntity(request)).thenReturn(booking);
        when(partnerServiceClient.getPartnerById(partnerId)).thenReturn(partnerDto);
        when(bookingRepository.findOverlappingBoardings(partnerId, checkIn, checkOut)).thenReturn(new ArrayList<>());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        BookingResponse expectedResponse = new BookingResponse(
                UUID.randomUUID(), petId, partnerId, userId, checkIn, BookingType.BOARDING,
                BookingStatus.PENDING, "Hospedagem 3 noites", BigDecimal.valueOf(150.00),
                checkIn, checkOut, serviceId, LocalDateTime.now(), LocalDateTime.now(), br.com.easypet.booking.domain.enums.PaymentMethod.CARD, null, null, null
        );
        when(bookingMapper.toResponse(any(Booking.class))).thenReturn(expectedResponse);

        // Act
        BookingResponse actualResponse = bookingService.createBooking(request);

        // Assert
        assertNotNull(actualResponse);
        assertEquals(BigDecimal.valueOf(150.00), actualResponse.price()); // 3 * 50 = 150
        assertEquals(checkIn, booking.getBookingDate()); // Compatibilidade com banco
        verify(bookingRepository, times(1)).save(booking);
    }

    @Test
    void createBooking_ShouldThrowException_WhenBoardingMissingDates() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        BookingRequest request = new BookingRequest(
                petId, partnerId, null, BookingType.BOARDING, "Sem datas",
                BigDecimal.valueOf(100.00), null, null, serviceId, null, null, null, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(new Booking());

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> bookingService.createBooking(request));
        assertEquals("As datas de check-in e check-out são obrigatórias para hospedagem.", ex.getMessage());
    }

    @Test
    void createBooking_ShouldThrowException_WhenCheckOutBeforeCheckIn() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime checkIn = LocalDateTime.now().plusDays(2);
        LocalDateTime checkOut = LocalDateTime.now().plusDays(1); // Inválido
        BookingRequest request = new BookingRequest(
                petId, partnerId, null, BookingType.BOARDING, "Datas invertidas",
                BigDecimal.valueOf(100.00), checkIn, checkOut, serviceId, null, null, null, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(new Booking());

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> bookingService.createBooking(request));
        assertEquals("A data de check-out deve ser posterior à data de check-in.", ex.getMessage());
    }

    @Test
    void createBooking_ShouldThrowException_WhenBoardingCapacityExceeded() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime checkIn = LocalDateTime.now().plusDays(1);
        LocalDateTime checkOut = LocalDateTime.now().plusDays(3); // 2 diárias
        BookingRequest request = new BookingRequest(
                petId, partnerId, null, BookingType.BOARDING, "Hotel cheio",
                BigDecimal.valueOf(100.00), checkIn, checkOut, serviceId, null, null, null, null
        );

        Booking booking = new Booking();
        booking.setPetId(petId);
        booking.setPartnerId(partnerId);
        booking.setType(BookingType.BOARDING);
        booking.setCheckIn(checkIn);
        booking.setCheckOut(checkOut);
        booking.setServiceId(serviceId);

        ServiceResponseDto serviceDto = new ServiceResponseDto(serviceId, "Hotel Comum", "Diária de Hotel", BigDecimal.valueOf(50.00), null, BillingUnit.DAILY);
        // Capacidade máxima é 2 pets
        PartnerResponseDto partnerDto = new PartnerResponseDto(partnerId, "Pet Paradise", 2, List.of(serviceDto));

        // Já existem 2 reservas ativas sobrepostas
        Booking overlapping1 = new Booking();
        overlapping1.setCheckIn(checkIn);
        overlapping1.setCheckOut(checkOut);
        Booking overlapping2 = new Booking();
        overlapping2.setCheckIn(checkIn);
        overlapping2.setCheckOut(checkOut);

        when(bookingMapper.toEntity(request)).thenReturn(booking);
        when(partnerServiceClient.getPartnerById(partnerId)).thenReturn(partnerDto);
        when(bookingRepository.findOverlappingBoardings(partnerId, checkIn, checkOut)).thenReturn(List.of(overlapping1, overlapping2));

        // Act & Assert
        BusinessException ex = assertThrows(BusinessException.class, () -> bookingService.createBooking(request));
        assertTrue(ex.getMessage().contains("Capacidade de hospedagem esgotada"));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_ShouldSucceed_WhenOrdinaryBookingWithRoundRobinAndSomeDayBookingsHaveNullStaffId() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime bookingDate = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);
        BookingRequest request = new BookingRequest(
                petId, partnerId, bookingDate, BookingType.GROOMING, "Banho cheiroso",
                BigDecimal.valueOf(80.00), null, null, serviceId, null, null, null, null
        );

        Booking booking = new Booking();
        booking.setPetId(petId);
        booking.setPartnerId(partnerId);
        booking.setBookingDate(bookingDate);
        booking.setType(BookingType.GROOMING);
        booking.setNotes("Banho cheiroso");
        booking.setPrice(BigDecimal.valueOf(80.00));

        UUID staffId = UUID.randomUUID();
        br.com.easypet.booking.client.dto.StaffResponseDto staffDto = new br.com.easypet.booking.client.dto.StaffResponseDto(
                staffId, partnerId, "Natalia", null, "ACTIVE", List.of(serviceId)
        );

        int targetDay = bookingDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY ? 1 : bookingDate.getDayOfWeek().getValue() + 1;
        br.com.easypet.booking.client.dto.StaffScheduleResponseDto scheduleDto = new br.com.easypet.booking.client.dto.StaffScheduleResponseDto(
                UUID.randomUUID(), staffId, targetDay, java.time.LocalTime.of(8, 0), java.time.LocalTime.of(18, 0)
        );

        Booking legacyBooking = new Booking();
        legacyBooking.setStaffId(null);

        Booking ordinaryBooking = new Booking();
        ordinaryBooking.setStaffId(staffId);

        BookingResponse expectedResponse = new BookingResponse(
                UUID.randomUUID(), petId, partnerId, userId, bookingDate, BookingType.GROOMING,
                BookingStatus.PENDING, "Banho cheiroso", BigDecimal.valueOf(80.00),
                null, null, serviceId, LocalDateTime.now(), LocalDateTime.now(), br.com.easypet.booking.domain.enums.PaymentMethod.CARD, null, staffId, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(booking);
        when(partnerServiceClient.getStaffByPartnerId(partnerId, serviceId)).thenReturn(List.of(staffDto));
        when(partnerServiceClient.getStaffAbsences(staffId)).thenReturn(List.of());
        when(partnerServiceClient.getStaffSchedule(staffId)).thenReturn(List.of(scheduleDto));
        
        LocalDateTime startOfDay = bookingDate.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = bookingDate.toLocalDate().atTime(23, 59, 59);
        when(bookingRepository.findByPartnerIdAndStatusNotAndBookingDateBetweenAndStaffIdNotNull(
                partnerId, BookingStatus.CANCELLED, startOfDay, endOfDay)).thenReturn(List.of(legacyBooking, ordinaryBooking));

        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);
        when(bookingMapper.toResponse(any(Booking.class))).thenReturn(expectedResponse);

        // Act
        BookingResponse actualResponse = bookingService.createBooking(request);

        // Assert
        assertNotNull(actualResponse);
        assertEquals(staffId, actualResponse.staffId());
        verify(bookingRepository, times(1)).save(booking);
    }

    @Test
    void createBooking_ShouldDefaultIsFittingRequestToFalse_WhenRequestFittingIsNull() {
        when(petServiceClient.getAccessiblePetOwner(petId)).thenReturn(userId);
        // Arrange
        LocalDateTime bookingDate = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);
        BookingRequest request = new BookingRequest(
                petId, partnerId, bookingDate, BookingType.GROOMING, "Banho cheiroso",
                BigDecimal.valueOf(80.00), null, null, serviceId, null, null, null, null
        );

        Booking booking = new Booking();
        booking.setPetId(petId);
        booking.setPartnerId(partnerId);
        booking.setBookingDate(bookingDate);
        booking.setType(BookingType.GROOMING);
        booking.setPrice(BigDecimal.valueOf(80.00));
        booking.setIsFittingRequest(null); 

        UUID staffId = UUID.randomUUID();
        br.com.easypet.booking.client.dto.StaffResponseDto staffDto = new br.com.easypet.booking.client.dto.StaffResponseDto(
                staffId, partnerId, "Natalia", null, "ACTIVE", List.of(serviceId)
        );

        int targetDay = bookingDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY ? 1 : bookingDate.getDayOfWeek().getValue() + 1;
        br.com.easypet.booking.client.dto.StaffScheduleResponseDto scheduleDto = new br.com.easypet.booking.client.dto.StaffScheduleResponseDto(
                UUID.randomUUID(), staffId, targetDay, java.time.LocalTime.of(8, 0), java.time.LocalTime.of(18, 0)
        );

        BookingResponse expectedResponse = new BookingResponse(
                UUID.randomUUID(), petId, partnerId, userId, bookingDate, BookingType.GROOMING,
                BookingStatus.PENDING, "Banho cheiroso", BigDecimal.valueOf(80.00),
                null, null, serviceId, LocalDateTime.now(), LocalDateTime.now(), br.com.easypet.booking.domain.enums.PaymentMethod.CARD, null, staffId, null
        );

        when(bookingMapper.toEntity(request)).thenReturn(booking);
        when(partnerServiceClient.getStaffByPartnerId(partnerId, serviceId)).thenReturn(List.of(staffDto));
        when(partnerServiceClient.getStaffAbsences(staffId)).thenReturn(List.of());
        when(partnerServiceClient.getStaffSchedule(staffId)).thenReturn(List.of(scheduleDto));
        
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);
        when(bookingMapper.toResponse(any(Booking.class))).thenReturn(expectedResponse);

        // Act
        BookingResponse actualResponse = bookingService.createBooking(request);

        // Assert
        assertNotNull(actualResponse);
        assertFalse(booking.getIsFittingRequest(), "O isFittingRequest deveria ter sido definido como false na lógica de fallback.");
        verify(bookingRepository, times(1)).save(booking);
    }
}
