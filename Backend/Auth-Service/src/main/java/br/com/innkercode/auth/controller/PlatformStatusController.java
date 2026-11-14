package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.service.PlatformStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/platform")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class PlatformStatusController {
    private final PlatformStatusService status;

    @GetMapping("/status")
    public ResponseEntity<PlatformStatusService.Snapshot> status() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(status.read());
    }
}
