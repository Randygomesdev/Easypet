INSERT INTO service_categories (id, name, slug, description, icon, booking_type, display_order, active)
VALUES
    (gen_random_uuid(), 'Saúde',        'saude',        'Consultas veterinárias, exames e procedimentos de saúde', 'stethoscope',   'CONSULTATION', 1, TRUE),
    (gen_random_uuid(), 'Estética',     'estetica',     'Banho, tosa e cuidados de beleza para pets',             'scissors',      'GROOMING',     2, TRUE),
    (gen_random_uuid(), 'Hospedagem',   'hospedagem',   'Hotel, creche e serviços de hospedagem para pets',       'home',          'BOARDING',     3, TRUE),
    (gen_random_uuid(), 'Adestramento', 'adestramento', 'Treinamento e comportamento animal',                     'award',         'OTHER',        4, TRUE),
    (gen_random_uuid(), 'Outros',       'outros',       'Outros serviços para pets',                              'more-horizontal','OTHER',       5, TRUE)
ON CONFLICT (slug) DO NOTHING;
