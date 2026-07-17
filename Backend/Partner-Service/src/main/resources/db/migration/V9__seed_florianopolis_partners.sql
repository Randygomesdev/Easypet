-- Seed de Parceiros em Florianópolis para Testes Ponta a Ponta

-- 1. Floripa Pet Resort & Creche (Hospedagem & Creche)
INSERT INTO partners (id, name, cnpj, description, address, number, neighborhood, city, state, zip_code, rating, phone, latitude, longitude, boarding_capacity, picture_url, active)
VALUES (
    '938b8162-4d3e-4c18-be74-57aed3b4f281',
    'Floripa Pet Resort & Creche',
    '45928172000188',
    'O refúgio perfeito para o seu pet em Florianópolis! Oferecemos serviços especializados de hospedagem e creche (daycare) com ampla área verde para recreação, quartos individuais climatizados, e monitoramento por câmeras 24 horas por nossa equipe de cuidadores apaixonados.',
    'Rodovia SC-401',
    '4500',
    'Saco Grande',
    'Florianópolis',
    'SC',
    '88032005',
    4.9,
    '48991234567',
    -27.5482,
    -48.5029,
    8,
    'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop',
    true
);

-- 2. Clínica Veterinária Beiramar (Consulta & Vacinas)
INSERT INTO partners (id, name, cnpj, description, address, number, neighborhood, city, state, zip_code, rating, phone, latitude, longitude, boarding_capacity, picture_url, active)
VALUES (
    'e8eb816f-4d3e-4c18-be74-57aed3b4f291',
    'Clínica Veterinária Beiramar',
    '12345678000199',
    'Clínica veterinária premium na Beiramar Norte. Contamos com atendimento de urgência, especialistas, exames laboratoriais e exames de imagem modernos. Nosso compromisso é com a saúde, bem-estar e longevidade do seu melhor amigo de quatro patas.',
    'Av. Jornalista Rubens de Arruda Ramos',
    '1800',
    'Centro',
    'Florianópolis',
    'SC',
    '88015700',
    5.0,
    '48988776655',
    -27.5852,
    -48.5562,
    0,
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop',
    true
);

-- 3. Sabor & Patas Pet Shop (Banho, Tosa & Loja)
INSERT INTO partners (id, name, cnpj, description, address, number, neighborhood, city, state, zip_code, rating, phone, latitude, longitude, boarding_capacity, picture_url, active)
VALUES (
    'f9fa816f-4d3e-4c18-be74-57aed3b4f301',
    'Sabor & Patas Pet Shop',
    '98765432000111',
    'Um novo conceito de pet shop em Florianópolis! Oferecemos banhos relaxantes com ozonioterapia, tosa higiênica e estilizada, além de uma ampla boutique com rações super premium, petiscos saudáveis e os melhores brinquedos do mercado.',
    'Rua Bocaiúva',
    '2300',
    'Centro',
    'Florianópolis',
    'SC',
    '88015530',
    4.8,
    '48999887766',
    -27.5843,
    -48.5539,
    0,
    'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=800&auto=format&fit=crop',
    true
);

-- Categorias dos Parceiros
INSERT INTO partner_categories (partner_id, category) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'SITTER');
INSERT INTO partner_categories (partner_id, category) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'PETSHOP');
INSERT INTO partner_categories (partner_id, category) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'CLINIC');
INSERT INTO partner_categories (partner_id, category) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'PETSHOP');
INSERT INTO partner_categories (partner_id, category) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'GROOMER');

-- Módulos Ativos
INSERT INTO partner_modules (partner_id, module_name) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'BOOKING');
INSERT INTO partner_modules (partner_id, module_name) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'BOOKING');
INSERT INTO partner_modules (partner_id, module_name) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'BOOKING');
INSERT INTO partner_modules (partner_id, module_name) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'SHOP');

-- Horários de Funcionamento (Segunda a Domingo)
-- Parceiro 1: Floripa Pet Resort
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'MONDAY', '08:00', '18:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'TUESDAY', '08:00', '18:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'WEDNESDAY', '08:00', '18:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'THURSDAY', '08:00', '18:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'FRIDAY', '08:00', '18:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'SATURDAY', '08:00', '15:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'SUNDAY', '09:00', '12:00', NULL, NULL, false);

-- Parceiro 2: Clínica Beiramar
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'MONDAY', '08:00', '20:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'TUESDAY', '08:00', '20:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'WEDNESDAY', '08:00', '20:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'THURSDAY', '08:00', '20:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'FRIDAY', '08:00', '20:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'SATURDAY', '08:00', '18:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'SUNDAY', '09:00', '13:00', NULL, NULL, false);

-- Parceiro 3: Sabor & Patas
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'MONDAY', '09:00', '19:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'TUESDAY', '09:00', '19:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'WEDNESDAY', '09:00', '19:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'THURSDAY', '09:00', '19:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'FRIDAY', '09:00', '19:00', '12:00', '13:00', false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'SATURDAY', '09:00', '16:00', NULL, NULL, false);
INSERT INTO partner_business_hours (partner_id, day_of_week, business_start_hour, business_end_hour, lunch_start_hour, lunch_end_hour, closed) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'SUNDAY', NULL, NULL, NULL, NULL, true);

-- Galeria de Imagens
INSERT INTO partner_gallery (partner_id, picture_url) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600');
INSERT INTO partner_gallery (partner_id, picture_url) VALUES ('938b8162-4d3e-4c18-be74-57aed3b4f281', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=600');
INSERT INTO partner_gallery (partner_id, picture_url) VALUES ('e8eb816f-4d3e-4c18-be74-57aed3b4f291', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600');
INSERT INTO partner_gallery (partner_id, picture_url) VALUES ('f9fa816f-4d3e-4c18-be74-57aed3b4f301', 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=600');

-- 6. Serviços Oferecidos
-- Serviços Floripa Pet Resort
INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    '938b8162-4d3e-4c18-be74-57aed3b4f282',
    '938b8162-4d3e-4c18-be74-57aed3b4f281',
    'Hospedagem VIP Canina (Diária)',
    'Hospedagem em quarto climatizado individual com atividades recreativas guiadas, alimentação monitorada e envio diário de fotos e relatórios de bem-estar.',
    120.00,
    0,
    'DAILY',
    true
);

INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    '938b8162-4d3e-4c18-be74-57aed3b4f283',
    '938b8162-4d3e-4c18-be74-57aed3b4f281',
    'Creche Daycare Standard (Diária)',
    'A melhor opção de socialização e gasto de energia para o seu cão enquanto você trabalha. Inclui atividades de enriquecimento ambiental e acompanhamento técnico.',
    65.00,
    0,
    'DAILY',
    true
);

INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    '938b8162-4d3e-4c18-be74-57aed3b4f284',
    '938b8162-4d3e-4c18-be74-57aed3b4f281',
    'Banho e Tosa Completo',
    'Serviço tradicional de banho morno com secagem rápida, tosa higiênica de patinhas e corte de unhas inclusos.',
    85.00,
    60,
    'HOURLY',
    true
);

-- Serviços Clínica Beiramar
INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    'e8eb816f-4d3e-4c18-be74-57aed3b4f292',
    'e8eb816f-4d3e-4c18-be74-57aed3b4f291',
    'Consulta Veterinária de Rotina',
    'Avaliação geral de saúde física, orientação nutricional e preventiva com nossos médicos veterinários dedicados.',
    150.00,
    30,
    'HOURLY',
    true
);

INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    'e8eb816f-4d3e-4c18-be74-57aed3b4f293',
    'e8eb816f-4d3e-4c18-be74-57aed3b4f291',
    'Vacinação Antirrábica',
    'Aplicação da vacina anual obrigatória contra a Raiva para cães e gatos. Carteirinha digital de vacinação inclusa no SuperApp.',
    80.00,
    15,
    'HOURLY',
    true
);

-- Serviços Sabor & Patas
INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    'f9fa816f-4d3e-4c18-be74-57aed3b4f302',
    'f9fa816f-4d3e-4c18-be74-57aed3b4f301',
    'Banho Relaxante Aromático',
    'Banho morno com shampoos biodegradáveis hipoalergênicos e uso de essências relaxantes de lavanda.',
    70.00,
    45,
    'HOURLY',
    true
);

INSERT INTO partner_services (id, partner_id, name, description, price, duration_minutes, billing_unit, active)
VALUES (
    'f9fa816f-4d3e-4c18-be74-57aed3b4f303',
    'f9fa816f-4d3e-4c18-be74-57aed3b4f301',
    'Tosa Higiênica Express',
    'Tosa focada nas regiões de maior acúmulo de sujeira (patinhas, barriga e região íntima) para a saúde do seu pet.',
    50.00,
    30,
    'HOURLY',
    true
);
