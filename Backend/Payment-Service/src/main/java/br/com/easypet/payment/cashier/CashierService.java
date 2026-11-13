package br.com.easypet.payment.cashier;

import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import static br.com.easypet.payment.cashier.CashierModels.*;

@Service
class CashierService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");
    private final CashierRepository repository;
    private final CashierAccess access;
    private final TransactionTemplate transaction;
    private final Clock clock;

    @Autowired
    CashierService(CashierRepository repository, CashierAccess access, PlatformTransactionManager manager) {
        this(repository, access, manager, Clock.systemUTC());
    }

    CashierService(CashierRepository repository, CashierAccess access, PlatformTransactionManager manager, Clock clock) {
        this.repository = repository;
        this.access = access;
        this.clock = clock;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page<Charge> charges(CashierAccess.Scope scope, boolean openOnly, int page, int size) {
        return repository.charges(scope.partnerId(), openOnly, page, size);
    }

    public Context context(CashierAccess.Scope scope, boolean canClose) {
        LocalDate today = now().businessDate();
        return new Context(scope.partnerId(), scope.actorId(), today,
                repository.closing(scope.partnerId(), today).isPresent(), true, canClose);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ChargeDetails chargeDetails(CashierAccess.Scope scope, UUID chargeId) {
        return new ChargeDetails(charge(scope.partnerId(), chargeId),
                repository.chargeMovements(scope.partnerId(), chargeId));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Day day(CashierAccess.Scope scope, LocalDate requestedDate, int page, int size) {
        LocalDate today = now().businessDate();
        LocalDate date = requestedDate == null ? today : requestedDate;
        rejectFuture(date, today);
        UUID partner = scope.partnerId();
        var closing = repository.closing(partner, date);
        return new Day(date, today, closing.map(CashierRepository.Closing::id).orElse(null),
                closing.map(CashierRepository.Closing::closedAt).orElse(null),
                closing.map(CashierRepository.Closing::closedBy).orElse(null),
                repository.totals(partner, date), repository.dayMovements(partner, date, page, size));
    }

    public Id createCharge(CashierAccess.Scope scope, UUID key, NewCharge request, String authorization) {
        long base = request.baseCents().longValueExact();
        long extras = request.extrasCents().longValueExact();
        long discount = request.discountCents().longValueExact();
        if (discount > base + extras) {
            throw new BusinessException("O desconto excede o valor da cobrança.");
        }
        String description = request.description().strip();
        var fingerprint = fingerprint("charge", request.bookingId(), base, extras, discount, description);
        // A replay returns the saved result even if the booking status has since changed.
        var previous = replay(scope, key, fingerprint);
        if (previous.isPresent()) {
            return new Id(previous.get());
        }
        access.verifyBooking(scope.partnerId(), request.bookingId(), authorization);
        return write(scope, key, fingerprint, time -> {
            ensureOpen(scope.partnerId(), time.businessDate());
            if (repository.hasCharge(scope.partnerId(), request.bookingId())) {
                throw conflict("Já existe uma cobrança para esta reserva.");
            }
            return repository.insertCharge(scope.partnerId(), scope.actorId(), time.instant(),
                    request.bookingId(), description, base, extras, discount);
        });
    }

    public Id receive(CashierAccess.Scope scope, UUID key, UUID chargeId, NewReceipt request) {
        long amount = request.amountCents().longValueExact();
        return write(scope, key, fingerprint("receipt", chargeId, request.method(), amount), time -> {
            Charge charge = charge(scope.partnerId(), chargeId);
            ensureOpen(scope.partnerId(), time.businessDate());
            if (amount > charge.balanceCents()) {
                throw conflict("O recebimento excede o saldo pendente.");
            }
            UUID id = UUID.randomUUID();
            repository.insertMovement(scope.partnerId(), new Movement(id, chargeId, charge.description(),
                    time.businessDate(), MovementType.RECEIPT, request.method(), amount, null, null,
                    time.instant(), scope.actorId()));
            return id;
        });
    }

    public Id reverse(CashierAccess.Scope scope, UUID key, UUID receiptId, NewReversal request) {
        String reason = request.reason().strip();
        return write(scope, key, fingerprint("reverse", receiptId, reason), time -> {
            Movement receipt = repository.receipt(scope.partnerId(), receiptId)
                    .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
            ensureOpen(scope.partnerId(), time.businessDate());
            if (repository.hasReversal(scope.partnerId(), receiptId)) {
                throw conflict("Este recebimento já foi revertido.");
            }
            UUID id = UUID.randomUUID();
            repository.insertMovement(scope.partnerId(), new Movement(id, receipt.chargeId(),
                    receipt.chargeDescription(), time.businessDate(), MovementType.REVERSAL, receipt.method(),
                    -receipt.amountCents(), reason, receiptId, time.instant(), scope.actorId()));
            return id;
        });
    }

    public Id close(CashierAccess.Scope scope, UUID key, LocalDate date) {
        return write(scope, key, fingerprint("close", date), time -> {
            rejectFuture(date, time.businessDate());
            return repository.closing(scope.partnerId(), date).map(CashierRepository.Closing::id)
                    .orElseGet(() -> repository.insertClosing(scope.partnerId(), date, time.instant(), scope.actorId()));
        });
    }

    private Id write(CashierAccess.Scope scope, UUID key, byte[] fingerprint, WriteOperation operation) {
        return Objects.requireNonNull(transaction.execute(status -> {
            repository.lockRegister(scope.partnerId());
            UUID result = replay(scope, key, fingerprint).orElseGet(() -> {
                UUID id = operation.execute(now());
                repository.saveCommand(scope.partnerId(), key,
                        new CashierRepository.Command(scope.actorId(), fingerprint, id));
                return id;
            });
            return new Id(result);
        }));
    }

    private Optional<UUID> replay(CashierAccess.Scope scope, UUID key, byte[] fingerprint) {
        return repository.command(scope.partnerId(), key).map(previous -> {
            if (!scope.actorId().equals(previous.actorId()) || !Arrays.equals(fingerprint, previous.fingerprint())) {
                throw conflict("A chave de idempotência já foi usada para outra operação.");
            }
            return previous.resultId();
        });
    }

    private Charge charge(UUID partnerId, UUID chargeId) {
        return repository.charge(partnerId, chargeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada."));
    }

    private void ensureOpen(UUID partnerId, LocalDate date) {
        if (repository.closing(partnerId, date).isPresent()) {
            throw new CashierException(HttpStatus.CONFLICT, "O caixa de hoje já foi fechado.", "CASHIER_DAY_CLOSED");
        }
    }

    private static void rejectFuture(LocalDate date, LocalDate today) {
        if (date.isAfter(today) || date.getYear() < 1) {
            throw new BusinessException("Informe uma data válida até o dia corrente.");
        }
    }

    private BusinessTime now() {
        var instant = clock.instant();
        return new BusinessTime(instant.atOffset(ZoneOffset.UTC), instant.atZone(BUSINESS_ZONE).toLocalDate());
    }

    private static byte[] fingerprint(Object... fields) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (Object field : fields) {
                byte[] bytes = field.toString().getBytes(StandardCharsets.UTF_8);
                digest.update(Integer.toString(bytes.length).getBytes(StandardCharsets.US_ASCII));
                digest.update((byte) ':');
                digest.update(bytes);
            }
            return digest.digest();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static CashierException conflict(String message) {
        return new CashierException(HttpStatus.CONFLICT, message);
    }

    private record BusinessTime(OffsetDateTime instant, LocalDate businessDate) {}

    private interface WriteOperation {
        UUID execute(BusinessTime time);
    }
}
