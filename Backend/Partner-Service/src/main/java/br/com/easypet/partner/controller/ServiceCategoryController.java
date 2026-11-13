package br.com.easypet.partner.controller;

import br.com.easypet.partner.dto.response.ServiceCategoryResponse;
import br.com.easypet.partner.service.ServiceCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Categorias e subcategorias de serviços da plataforma")
public class ServiceCategoryController {

    private final ServiceCategoryService categoryService;

    @GetMapping
    @Operation(summary = "Listar categorias de serviço", description = "Retorna todas as categorias ativas com suas subcategorias.")
    public ResponseEntity<List<ServiceCategoryResponse>> findAll() {
        return ResponseEntity.ok(categoryService.findAll());
    }
}
