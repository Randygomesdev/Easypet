package br.com.easypet.payment.service;

import br.com.easypet.payment.domain.entity.CreditTransaction;
import br.com.easypet.payment.domain.entity.UserCreditBalance;
import br.com.easypet.payment.exception.BusinessException;
import br.com.easypet.payment.repository.CreditTransactionRepository;
import br.com.easypet.payment.repository.UserCreditBalanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreditWalletService {

    private final UserCreditBalanceRepository balanceRepository;
    private final CreditTransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID userId) {
        return balanceRepository.findByUserId(userId)
                .map(UserCreditBalance::getBalance)
                .orElse(BigDecimal.ZERO);
    }

    @Transactional
    public BigDecimal addCredit(UUID userId, BigDecimal amount, String reason, UUID bookingId) {
        UserCreditBalance wallet = balanceRepository.findByUserId(userId)
                .orElseGet(() -> UserCreditBalance.builder()
                        .userId(userId)
                        .balance(BigDecimal.ZERO)
                        .build());

        wallet.setBalance(wallet.getBalance().add(amount));
        balanceRepository.save(wallet);

        transactionRepository.save(CreditTransaction.builder()
                .userId(userId)
                .amount(amount)
                .reason(reason)
                .bookingId(bookingId)
                .build());

        log.info("Crédito adicionado: userId={} amount={} reason={}", userId, amount, reason);
        return wallet.getBalance();
    }

    @Transactional
    public BigDecimal deductCredit(UUID userId, BigDecimal amount) {
        UserCreditBalance wallet = balanceRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Saldo de créditos insuficiente."));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new BusinessException("Saldo de créditos insuficiente.");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        balanceRepository.save(wallet);

        transactionRepository.save(CreditTransaction.builder()
                .userId(userId)
                .amount(amount.negate())
                .reason("Uso de créditos no checkout")
                .build());

        log.info("Crédito debitado: userId={} amount={} saldo={}", userId, amount, wallet.getBalance());
        return wallet.getBalance();
    }
}
