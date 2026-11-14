package br.com.easypet.payment.cashier;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/cashier/bookings")
class AdminCashierController {
    private final CashierService cashier;

    AdminCashierController(CashierService cashier) {
        this.cashier = cashier;
    }

    @GetMapping("/{bookingId}")
    CashierModels.AdminBookingCashier booking(
            @PathVariable UUID bookingId, @RequestParam UUID partnerId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return cashier.adminBooking(partnerId, bookingId, page, size);
    }
}
