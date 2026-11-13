# Google OAuth — diagnóstico para homologação

Consulta em 13/11/2026, pela sessão do usuário no Google Cloud. Domínio informado pelo usuário: `https://easypet.innker.com.br`. Base de código inspecionada: `79d4a6c021abc1119e666289df83d25491a34145`.

## Evidência observada

- Projeto `easypet-494022`; cliente web existente chamado `Easypet.com.br`, criado em 21/04/2026. A chave secreta aparece com status **Ativado**. Não há evidência de cliente excluído/revogado nesta consulta; isso não comprova que o segredo disponível no ambiente corresponda ao ativo.
- O console informa último uso em 13/11/2026, com ressalva de atraso na atualização desse dado. Não houve tentativa de login nesta inspeção.
- Origens autorizadas: `http://localhost:8081`, `http://localhost:8080` e `http://localhost:5173`.
- Redirecionamentos autorizados: `http://localhost:8081/api/v1/login/oauth2/code/google` e `http://localhost:5173/login-success`. O domínio de homologação não está cadastrado.
- Público externo, status **Testando**, sem usuários de teste. A tela informa publicação indisponível enquanto a configuração de branding estiver incompleta.
- Branding: nome e contatos preenchidos; página inicial, política de privacidade, termos e domínios autorizados vazios.
- Nenhuma configuração foi salva, chave revelada, criada ou rotacionada. Não foi executado login nem aceite OAuth integrado.

Fontes da inspeção: [credenciais](https://console.cloud.google.com/apis/credentials?project=easypet-494022), [clientes](https://console.cloud.google.com/auth/clients?project=easypet-494022), [público](https://console.cloud.google.com/auth/audience?project=easypet-494022) e [branding](https://console.cloud.google.com/auth/branding?project=easypet-494022).

## Bloqueios confirmados no artefato H1

- Auth carrega o registro Google e habilita `oauth2Login` somente fora do perfil `homolog`.
- Compose H1 usa `prod,homolog` e não injeta as variáveis Google.
- Frontend usa `internalPilot` para esconder o botão Google e redirecionar `/login-success` de volta ao login.
- Ingresso Nginx não libera o fluxo Google e bloqueia a troca OAuth sob `/api/v1/auth/`; Gateway não tem rotas para autorização e callback do Spring.

O aceite H1 existente permanece válido para seu recorte, que exclui login social. Credenciais ativas não bastam para habilitar esse recurso. Não desativar globalmente o piloto para contornar esses bloqueios.

## Próxima entrega e aceite pendentes

1. S02: definir habilitação explícita do Google em homologação, preservar contas inativas, restrição de equipe, papéis e revogação de sessão; integrar botão, retorno, cancelamento e falhas. Coordenar rotas compartilhadas com S01.
2. S02/S07: fechar contrato de ingresso HTTPS, autorização, callback e troca de código, com estado OAuth/cookie preservado e proteção contra repetição. Candidato de callback, sujeito à implementação e validação: `https://easypet.innker.com.br/api/v1/login/oauth2/code/google`. `/login-success` é retorno interno da aplicação após o callback, não o callback do Spring.
3. Configurar Google para o domínio escolhido, completar os dados públicos necessários e definir contas de teste para a homologação. Confirmar posse do segredo ativo por meio seguro; rotacionar somente se necessário, sem colocar segredo no chat, Git ou evidências.
4. S07: injetar configuração por ambiente, ajustar ingresso com rotas estritas, validar HTTPS e executar aceite integrado com S02. Cobrir login/retorno, recusa/cancelamento, estado inválido, código expirado/reutilizado, conta desativada, equipe e preservação das negativas H1. Distinguir provedor simulado do login real Google.
5. Repetir smoke no domínio publicado e registrar evidência antes de marcar login social como entregue/validado.

Responsáveis acima indicam ownership proposto para a próxima entrega; esta consulta não despachou nova missão aos workers.
