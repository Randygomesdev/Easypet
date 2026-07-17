-- Adiciona novos campos de endereço
ALTER TABLE partners ADD COLUMN zip_code VARCHAR(10);
ALTER TABLE partners ADD COLUMN number VARCHAR(20);
ALTER TABLE partners ADD COLUMN neighborhood VARCHAR(100);
ALTER TABLE partners ADD COLUMN complement VARCHAR(100);
ALTER TABLE partners ADD COLUMN state VARCHAR(2);

-- Cria tabela para múltiplas categorias
CREATE TABLE partner_categories (
    partner_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    CONSTRAINT fk_partner_categories FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- Migra a categoria atual para a nova tabela de coleções
INSERT INTO partner_categories (partner_id, category)
SELECT id, category FROM partners WHERE category IS NOT NULL;

-- Remove a coluna de categoria única (após a migração)
ALTER TABLE partners DROP COLUMN category;

-- Cria tabela para módulos dinâmicos
CREATE TABLE partner_modules (
    partner_id UUID NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    CONSTRAINT fk_partner_modules FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);
