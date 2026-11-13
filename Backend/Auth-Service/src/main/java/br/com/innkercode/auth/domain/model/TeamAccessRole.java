package br.com.innkercode.auth.domain.model;

import java.util.List;

public enum TeamAccessRole {
    MANAGER("BOOKINGS_READ", "BOOKINGS_WRITE", "DESK_CUSTOMERS_MANAGE", "CASH_RECEIVE", "CASH_CLOSE"),
    RECEPTION("BOOKINGS_READ", "BOOKINGS_WRITE", "DESK_CUSTOMERS_MANAGE", "CASH_RECEIVE"),
    PROFESSIONAL("BOOKINGS_ASSIGNED_READ", "BOOKINGS_ASSIGNED_ATTEND");

    private final List<String> permissions;

    TeamAccessRole(String... permissions) {
        this.permissions = List.of(permissions);
    }

    public List<String> permissions() {
        return permissions;
    }
}
