# Versionamento das entregas S01–S07 e H1

Em 13/11/2026, o usuário autorizou organizar todo o trabalho concluído em commits e enviá-lo ao remoto `origin`, repositório `Randygomesdev/Easypet`. A branch de trabalho é `codex/unificar-develop`; a `main` permanece separada. O limite anterior da missão R01 que proibia commits foi substituído por essa autorização explícita.

## Organização

| Commit | Conteúdo |
| --- | --- |
| `0f495d7` | Exclusões de artefatos/credenciais locais e indexação Graphify. |
| `8159a5c` | Auth: recuperação, equipe, sessão e administração de contas. |
| `3f3ec37` | Partner/Pet: balcão, reivindicação, equipe e administração de estabelecimentos. |
| `c615208` | Booking: agenda, idempotência, contexto, cancelamento e reagendamento. |
| `a958b8c` | Payment: ledger, recebimentos, reversões e fechamento. |
| `bbcb843` | Notification: fila persistente, administração e SMTP interno. |
| `8d119fd` | Frontend: componentes e jornadas operacionais/móveis integradas. |
| `e32ddb0` | Infraestrutura, Gateway, Compose, operação e testes integrados H1. |

O commit de documentação que contém este arquivo reúne roadmap, specs, missions, contratos e evidências históricas. Os três commits locais anteriores (`1477a57`, `8abb282`, `ceba61c`) são preservados na mesma história e também fazem parte do envio da branch. Não houve squash, rebase, alteração da main ou force-push.

## Conteúdo preservado e verificações

O inventário pré-commit conferiu as 640 entradas do aceite H1: os **630 arquivos presentes conservam seus bytes**, e as dez exclusões já aceitas foram efetivadas no Git. Depois do commit, essas exclusões deixam de aparecer em `git ls-files`; a redução de 640 para 630 entradas no inventário não significa perda de código. Os snapshots antigos continuam referindo o HEAD da execução e não foram reescritos para aparentar testes no novo HEAD.

Os commits organizam o conteúdo aprovado: 22/22 cenários integrados, 162 testes Java conferidos, typecheck, restauração de seis bancos e complemento operacional H1-01. Não houve nova execução dessas suítes nesta etapa, pois não foi alterado código de produto. `.gitignore` passou a excluir `Backend/*/bin/`, arquivos `.class` e arquivos locais de ambiente/credenciais, preservando os exemplos. Os arquivos ignorados continuam no disco.

Gitleaks examinou 519 arquivos candidatos (cerca de 5 MB): 1.093 apontamentos eram linhas de hashes SHA-256 das evidências; os dois restantes eram um token fixo de teste do Gateway e uma chave de idempotência de exemplo no contrato Booking. A revisão não identificou credencial real nesses apontamentos. A varredura dos três commits locais anteriores não encontrou apontamentos. Os relatórios temporários da ferramenta não fazem parte da publicação.

Cada conjunto de arquivos foi conferido antes do commit, incluindo `git diff --cached --check`. Espaços finais/linhas vazias excedentes foram normalizados apenas na documentação Markdown. `.gitattributes` preserva os bytes dos JSONs, logs e fontes isoladas de evidência; os logs e probes históricos conservam seu whitespace original. O manifesto final deve ser gerado fora do checkout, com `node scripts/production/release.mjs`, e verificado com `node scripts/production/release.mjs --verify <manifesto.json>` após o commit de documentação. O HEAD e o manifesto finais são identificados no resultado da execução do envio; um manifesto dentro do próprio commit criaria uma referência circular ao HEAD.

## Limite desta entrega

Versionar e enviar a branch não executa deploy. Permanecem preflight da VPS compartilhada, domínio/HTTPS, acesso restrito, credenciais próprias do ambiente e smoke no endereço publicado. Os demais requisitos de piloto, suporte, backups/alertas operados e dados reais continuam no roadmap.
