package br.com.innkercode.auth.repository;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where lower(u.email) = :email order by u.id")
    List<User> findGoogleAccountsForUpdate(String email);

    boolean existsByGoogleSubject(String subject);

    @Query("select u.email from User u where u.id = :id and u.role = :role and u.active = true")
    Optional<String> findActiveEmailByIdAndRole(UUID id, UserRole role);

    boolean existsByIdAndRoleAndActiveTrue(UUID id, UserRole role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.email = :email")
    Optional<User> findByEmailForUpdate(String email);

    @Query("select u.id from User u where u.email = :email")
    Optional<UUID> findIdByExactEmail(String email);

    @Query("""
            select u.id from User u where lower(u.email) = lower(:email)
              and (select count(other) from User other where lower(other.email) = lower(:email)) = 1
            """)
    Optional<UUID> findUniqueLegacyEmailId(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u from User u where lower(u.email) = lower(:email)
              and (select count(other) from User other where lower(other.email) = lower(:email)) = 1
            """)
    Optional<User> findUniqueLegacyEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(UUID id);

    @Query("""
            select u from User u where u.role = :role
                and (:active is null or u.active = :active)
                and (locate(:term, lower(u.name)) > 0 or locate(:term, lower(u.email)) > 0)
            """)
    Page<User> searchByRole(UserRole role, Boolean active, String term, Pageable pageable);
}
