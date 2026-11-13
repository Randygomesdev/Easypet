package br.com.easypet.partner.service;

import br.com.easypet.partner.dto.response.ServiceCategoryResponse;
import br.com.easypet.partner.dto.response.ServiceSubcategoryResponse;
import br.com.easypet.partner.repository.ServiceCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceCategoryService {

    private final ServiceCategoryRepository categoryRepository;

    public List<ServiceCategoryResponse> findAll() {
        return categoryRepository.findAllByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(c -> new ServiceCategoryResponse(
                        c.getId(),
                        c.getName(),
                        c.getSlug(),
                        c.getDescription(),
                        c.getIcon(),
                        c.getBookingType(),
                        c.getDisplayOrder(),
                        c.getSubcategories().stream()
                                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                                .map(s -> new ServiceSubcategoryResponse(
                                        s.getId(), s.getName(), s.getSlug(), s.getDisplayOrder()))
                                .toList()
                ))
                .toList();
    }
}
