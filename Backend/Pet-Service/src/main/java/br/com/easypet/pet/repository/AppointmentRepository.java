package br.com.easypet.pet.repository;

import br.com.easypet.pet.domain.entity.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    Page<Appointment> findAllByPetIdOrderByDateDesc(UUID userId, Pageable pageable);
    java.util.List<Appointment> findAllByPetIdOrderByDateDesc(UUID petId);
}
