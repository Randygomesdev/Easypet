# Publicação EasyPet — homologação em 13/11/2026

EasyPet publicado em **https://easypet.innker.com.br**, na VPS de homologação compartilhada com Setoriza. Escopo autorizado: testes internos e demonstrações controladas, sem operação real. Publicação e smoke executados neste chat; não constituem uma nova rodada da S07.

## Release e instalação

- Backend e painel master: `4f6ce3c`; checkout final `354eebb`, com correções de título, favicon, idioma do HTML e crédito do rodapé. A aba mostra `EasyPet`; o favicon usa o SVG oficial com endereço versionado pelo Vite. Conteúdo e MIME conferidos no domínio publicado. Rodapé `Developed by Innker Tecnologia`, com link para `https://innker.com.br` em nova aba.
- Imagens construídas fora da VPS, transportadas por SSH com limite de banda e conferidas por SHA-256 e IDs. Nenhum build Maven, Gradle ou Vite foi executado no host compartilhado. Manifestos de checkout limpo guardados em `/srv/easypet-release`.
- Projeto `easypet-homolog`, 16 serviços, cinco arquivos Compose: base, host, compacto, demonstração e monitoramento. Tetos somados de 3.632 MiB, swap desabilitado; única porta publicada em `127.0.0.1:18080`. Rede própria `172.30.80.0/24`, sem conexão com redes Setoriza.
- Preflight imediatamente anterior à subida: 4.765 MiB disponíveis, acima dos 4.656 MiB exigidos. Disco, porta, Docker/Compose, proxy informado e certificado aprovados.
- Node.js 24.22.3 instalado a partir da distribuição oficial, com SHA-256 conferido. Configuração exclusiva em `/etc/easypet/homolog.env`, root, modo 600. Não foram reaproveitados segredos Setoriza.
- Registro A do subdomínio criado no Registro.br; demais registros preservados. Nginx recebeu somente vhost/snippet EasyPet. `nginx -t` passou antes dos reloads. Certificado próprio emitido por webroot, válido até 11/02/2027 às 22h12 (America/Sao_Paulo); simulação de renovação aprovada e hook específico instalado. Nginx não foi parado.

## Contas e login

Cinco contas provisionadas conforme papéis explicitamente definidos pelo usuário: um ADMIN, dois PARTNER e dois CUSTOMER. A lista de endereços, senhas e hashes permanece em arquivos privados. O provisionamento operacional validou a lista previamente aprovada e exigiu tabela de contas vazia antes da transação; o provisionador genérico de ADMIN fictício não foi alterado.

O ADMIN corporativo usa e-mail e senha, conforme confirmação do usuário. Sua conta Google usa e-mail Zoho e não atende à regra de autoridade Google para vinculação automática. Ela foi excluída da allowlist OAuth do ambiente. A senha inicial foi gerada aleatoriamente e guardada na estação em `.env.admin-homolog.local`, ignorado pelo Git e com ACL restrita.

Google foi ativado somente para as quatro contas Gmail convidadas. Login real aprovado no navegador com um parceiro e um tutor, com retorno aos painéis corretos e vínculos conferidos no banco por papel. Cancelamento real retornou à tela de login com mensagem recuperável. O tutor foi recusado ao abrir o painel master. As outras duas contas Gmail foram provisionadas e tiveram papel/login por senha conferidos, mas não fizeram login Google individual nesta rodada.

O redirecionamento HTTP foi conferido sem registrar códigos/cookies: destino Google, callback HTTPS exato, state, nonce, PKCE S256, cookie Secure/HttpOnly e recusa de troca inválida. A nova chave foi usada com sucesso; a chave antiga não foi desativada nesta publicação. Cadastro público, checkout, créditos e caminhos internos continuam bloqueados.

## Smoke e monitoramento

- **33 verificações no domínio publicado**, cobrindo login das cinco contas, autorização ADMIN e recusas, indicadores do master, criação de dois estabelecimentos fictícios, equipe/serviço, pet, reserva e atendimento concluído, além de isolamento entre parceiros. Os dados identificados como demonstração foram mantidos para uso interno.
- Diagnóstico final com 16 serviços saudáveis. O timer `easypet-monitor.timer` coleta a cada minuto; Auth recebe apenas o JSON sanitizado em montagem somente de leitura. Não recebe socket Docker.
- API do master aprovada com saúde e RAM reais do host. Pausa controlada somente do timer produziu `STALE` com amostra de 136 segundos; após reativação, `AVAILABLE` com amostra de cinco segundos. Timer reativado e habilitado para próximos boots.
- Backup inicial dos seis bancos em `/srv/easypet-backups/2026-11-13-publicacao`, após o smoke e sem novos comandos de escrita da suíte em andamento. Dumps são consistentes individualmente; não foi realizado ensaio de restauração nem certificada recuperação global na VPS compartilhada. Os ensaios locais anteriores permanecem a evidência de restauração.
- E-mail externo segue bloqueado pela política de homologação. A reserva de demonstração com conta Gmail gerou uma notificação sem destinatário permitido, registrada como falha terminal; não foi enviada mensagem externa. Isso não é falha de saúde do container. Recuperação por e-mail e convites de equipe para endereços reais continuam fora deste aceite.

## Convivência com Setoriza e limites

O acompanhamento temporário registrou RAM, cgroups, OOM/reinícios e resposta HTTPS Setoriza antes, durante e depois da subida. Seus critérios de interrupção atingiam somente EasyPet: memória disponível inferior a 1 GiB por 30 segundos, OOM/reinício inesperado EasyPet ou três respostas Setoriza com erro/lentidão acima do limiar operacional. O coletor permanente do master é apenas informativo; esse acompanhamento temporário não instala um desligamento automático permanente.

Foram observados **20,18 minutos desde a primeira amostra com os 16 containers em execução**, incluindo a ativação Google e as duas correções visuais. Maior somatório amostrado EasyPet: **2.209,21 MiB**; menor RAM disponível no host: **2.532,62 MiB**. Todas as respostas HTTPS Setoriza durante a convivência foram 200, com máximo de **0,2088 s**. Não houve acionamento dos critérios de interrupção, OOM, swap ou reinício inesperado EasyPet. Os arquivos Nginx preexistentes e os IDs, horários de início, contadores de reinício e OOM dos **15 containers preexistentes** permaneceram iguais à linha de base. Consulte os valores finais, a duração e os hashes das evidências no [resumo do aceite](../sprints/R01-review/deployment-acceptance.json).

Este aceite cobre uma demonstração acompanhada, não capacidade sustentada ou garantia de ausência de impacto futuro. Manter poucas sessões e acompanhar o host compartilhado. Decisões do piloto real, canal externo, alertas recebidos por um responsável, anexos e recuperação completa continuam nos cards próprios. A desativação da chave Google antiga permanece uma ação separada.

## Operação e reversão

Usar o [roteiro com os cinco arquivos Compose](setoriza-homolog.md). A cópia privada local `.env.easypet-vps.local` foi sincronizada com o ambiente publicado. Não executar builds no host. Para pressão de recursos, parar somente o projeto EasyPet, preservando volumes; não trocar automaticamente para o perfil padrão maior.

Para reverter apenas a correção visual, a imagem anterior está retida como `easypet-homolog-frontend:4f6ce3c-google-on`. Para desativar OAuth, a configuração inicial protegida e a imagem `google-off` foram preservadas; manter o mesmo conjunto de overlays. Não remover volumes para reverter um problema de aplicação. Não modificar o vhost ou os serviços Setoriza.
