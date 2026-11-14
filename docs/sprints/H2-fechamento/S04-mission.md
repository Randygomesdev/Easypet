# S04 — Catálogo, balcão e tutores H2

Leia `spec.md` desta rodada. Ownership histórico Partner/Pet/customer UI. `HomePage.tsx` e `partner.service.ts` pertencem a S01 nesta rodada; publique contrato antes de pedir integração.

Complete busca pública por nome de estabelecimento, cidade e nome de serviço ativo, combinada com categoria e paginação estável. Não expor estabelecimento/serviço inativo, não duplicar estabelecimento com vários serviços, preservar limites/filtros e compatibilidade. Publique contrato e exemplos para S01.

Defina e implemente contrato mínimo de destinatário autorizado de balcão para S06, com contato/consentimento/proveniência/revogação explícitos e autenticação interna; não vincular conta nem atribuir titularidade por coincidência de e-mail. Envio real continua desativado. Preserve reivindicação existente e isolamento entre estabelecimentos.

Integre trilha de administração de tutor na UI consumindo S02, incluindo motivo e histórico real, sem modificar Auth. Registre pedidos de primitiva/rota para S01. Valide filtros combinados, inativos, duplicação/paginação, consentimento revogado, acesso indevido e UI. Testes Docker aguardam S07. Relatórios em `S04-balcao/h2-contracts.md`, h2-status e h2-integration.
