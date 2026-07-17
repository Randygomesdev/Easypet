-- Cria tabela para galeria de imagens
CREATE TABLE partner_gallery (
    partner_id UUID NOT NULL,
    picture_url VARCHAR(255) NOT NULL,
    CONSTRAINT fk_partner_gallery FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- Cria tabela para avaliações de parceiros
CREATE TABLE partner_reviews (
    id UUID PRIMARY KEY,
    partner_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(1000),
    author_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT fk_partner_reviews FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);
