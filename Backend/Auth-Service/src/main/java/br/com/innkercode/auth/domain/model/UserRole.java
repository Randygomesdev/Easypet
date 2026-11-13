package br.com.innkercode.auth.domain.model;

import lombok.Getter;

@Getter
public enum UserRole {
    ADMIN,
    USER,
    CUSTOMER,
    PARTNER,
    TEAM_MEMBER
}
