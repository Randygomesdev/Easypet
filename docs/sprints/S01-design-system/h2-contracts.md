# H2 — Contratos frontend S01

Publicado em 14/11/2026. Rotas de navegador são `GET`, sem corpo ou persistência própria. As APIs, erros, paginação e migrações pertencem aos contratos produtores. As áreas protegidas usam a sessão verificada de `/auth/session` e o bearer original.

| Rota web | Acesso e comportamento |
| --- | --- |
| `/app/home` | CUSTOMER. Combina busca textual e categoria no catálogo do Partner, com página inicial ao mudar filtro e sem perder filtros no retry. |
| `/admin/auditoria` | ADMIN. Consulta paginada de auditoria Auth, sem mutações. |
| `/admin/ocorrencias` | ADMIN. Consulta por ID de reserva. Carrega contexto de Booking, Payment e Notification separadamente e permite repetir cada leitura. |
| `/admin/alertas` | ADMIN. Lista estados operacionais e chamados para reconhecimento e resolução conforme contrato S06. O sino abre a central. |
| `/suporte` | Orientação de suporte H1 acessível com sessão indisponível. Para usuários autenticados, mostra apenas chamados da própria sessão e permite registrar solicitação. CUSTOMER pode consultar e salvar sua preferência de e-mail de agendamento. ADMIN acessa a central. |

Exemplo de investigação `/admin/ocorrencias?reserva=43bf8767-c38a-4ca8-a09a-bb680a2897be`. O UUID é referência para leitura, e cada serviço valida `ADMIN`. Falha em uma leitura não indica ausência dos dados daquele serviço. Registro de chamado e alterações de estado acontecem por ação explícita, com bloqueio de envios concorrentes na tela. A política de repetição segue o contrato S06. Nenhuma credencial no frontend.
