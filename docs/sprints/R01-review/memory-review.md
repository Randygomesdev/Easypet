# R01 — memória do EasyPet na VPS compartilhada

Pedido de 13/11/2026: verificar redução de memória do EasyPet antes de ampliar a VPS, preservando o Setoriza. Base da avaliação: `344e2d6`. S07 executa os ensaios EasyPet exclusivamente no Docker local; R01 revisa os resultados e lê as métricas da VPS. Nenhum teste de carga EasyPet foi executado na VPS.

## Referência da VPS

O coletor [inspect-memory.py](../../../scripts/production/setoriza-homolog/inspect-memory.py) lê somente `/proc`, cgroup v2 e metadados selecionados do Docker. Não lê ambientes, conteúdo de logs, bancos ou sessões de usuários. [Sumário de 30 amostras](memory-vps-baseline.json), entre 20:11:28 e 20:16:26 de 13/11/2026, horário de São Paulo:

- RAM total: 7.941,18 MiB; disponível: 4.818,41–4.905,89 MiB; swap ausente.
- Soma amostrada de memória cobrada aos 15 containers existentes: 2.480,18–2.574,51 MiB. Inclui cache contabilizado pelo cgroup; não equivale a memória anônima nem ao consumo total do host.
- Deltas de CPU do host no intervalo: 14,81% user, 8,71% system/IRQ, 48,89% idle, 0,51% iowait e 27,09% steal. A redução de RAM não resolve essa indisponibilidade de vCPU nem comprova ausência de impacto de CPU/I/O.
- Nenhuma amostra registrou erro de medição. Não foi observado OOM. Frontend e Operations mudaram o horário de início durante a janela; os deltas de contadores dessas instâncias não são comparáveis. A coleta não representa uma janela de deploy estável. Esta tarefa executou somente leituras na VPS.
- Picos de vida observados em instâncias Setoriza: WAHA aproximadamente 1.783 MiB, PostgreSQL 720 MiB e MinIO 512 MiB. Esses picos não foram necessariamente simultâneos e não devem ser somados como pico do host. WAHA tem teto configurado de 4.096 MiB, portanto disponibilidade instantânea não é uma reserva permanente para o EasyPet.

O `memory.events.max` observado no MinIO já era 1.054 na primeira amostra, sem OOM; alcançar o limite com reclaim de cache não equivale a um processo morto. A interpretação usa os [contadores documentados do cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html).

## Contrato da comparação local

Os 5.408 MiB do Compose padrão são limites somados, não consumo medido. A comparação deve registrar configuração, consumo, tempo e resultado dos cenários separadamente. Docker local dispõe de 12 CPUs e aproximadamente 15,56 GiB; os dois ensaios recebem afinidade de quatro CPUs. Isso não reproduz CPU steal, I/O nem a concorrência com o Setoriza na VPS.

Critérios: início em volumes novos; serviços e funções preservados; H1 e OAuth completos; restauração dos seis bancos; zero OOM/reinícios inesperados; candidato sem dependência de swap; margem por serviço; comparação de CPU/duração sem chamar ensaio funcional de teste de capacidade. Amostras sequenciais têm janela de leitura: o máximo da soma amostrada aproxima simultaneidade, mas não mede o pico absoluto do conjunto.

O overlay compacto é opt-in. A configuração padrão não será reduzida globalmente. `shared_buffers`, memória por operação/conexão e concorrência dos pools devem ser avaliados junto ao heap e à memória nativa Java. A [documentação PostgreSQL 15](https://www.postgresql.org/docs/15/runtime-config-resource.html) e a [orientação de coletores Java 21](https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html) fundamentam hipóteses de ajuste; só os ensaios podem validá-las no aplicativo.

## Resultado

A primeira referência (`easypet-e2e-da0ce82cf4`) passou nos 28 cenários em 4,8 minutos, mas **não foi aprovada como medição completa**. R01 leu o arquivo bruto: 52 erros no coletor, 22 amostras concentradas em startup/cleanup e nenhuma amostra dos 16 serviços em execução. O template Docker acessava `State.Health` em fixtures sem healthcheck e invalidava a leitura em lote. A restauração também não iniciou: o overlay de afinidade incluía fixtures sem imagem/build no projeto exclusivo de bancos. S07 corrigiu os dois pontos e iniciou nova referência. Não usar esse conjunto parcial para calcular redução agregada.

A referência corrigida (`easypet-e2e-d642142284`) terminou com saída zero: 28 cenários em 5,2 minutos e seis bancos restaurados. R01 conferiu o bruto: 97 amostras, das quais 29 completas com os 16 serviços ativos (27 durante Playwright e duas ainda marcadas como startup); máximo da soma amostrada de **2.742,96 MiB**, seis medições finais de restauração e nenhum valor observado de swap ou OOM kill. Um erro de coleta ocorreu durante a limpeza, às 23:44:04 UTC, após as seis medições finais de restauração. Auth atingiu pico individual de 457,64 MiB; Partner, 385,54 MiB. Esses números não são uma soma de picos individuais.

R01 conferiu o Compose base mais overlays do host e compacto: 16 serviços, teto total de 3.072 MiB, swap desabilitado em todos, somente frontend exposto em loopback e rede SMTP interna preservada. O candidato usa SerialGC, heap explícito por serviço, pilhas de 512 KiB, dois processadores informados à JVM, menos threads mínimas e pool Hikari de 1–6 conexões. PostgreSQL usa shared_buffers 32 MB, max_connections 24, work_mem 2 MB e maintenance_work_mem 16 MB. `ActiveProcessorCount=2` ajusta decisões internas da JVM; não é uma quota de CPU nem reserva CPU para o Setoriza.

O primeiro candidato de 3.072 MiB (`easypet-e2e-0263f7c674`) foi **reprovado na inicialização**. O registro Docker contém eventos OOM em Partner e Auth; o runner saiu com código 1, sem amostras completas em execução nem restauração. Não usar seus limites como configuração aprovada. A S07 iniciou um segundo candidato de 3.504 MiB, com maior margem nos serviços Java e os ajustes de JVM/PostgreSQL preservados.

R01 também conferiu as saídas filtradas da inspeção do segundo candidato: os sete serviços Java reconheceram `JDK_JAVA_OPTIONS` e `JAVA_TOOL_OPTIONS`, incluindo SerialGC e os heaps definidos. Os seis bancos retornaram `32MB|2MB|16MB|24|on|on` para shared_buffers, work_mem, maintenance_work_mem, max_connections, autovacuum e fsync. A observação de 2–4 conexões ociosas por banco durante a suíte não equivale a testar a saturação dos pools. Entre os snapshots da referência e do candidato mudaram apenas o runner, o script de restauração, o overlay compacto e o coletor; os testes e o código funcional permaneceram iguais.

O segundo candidato (`easypet-e2e-f8ac4259f1`) concluiu com saída zero: **28 cenários em 5,0 minutos**, seis bancos restaurados, 55 tabelas e 14 consultas de referência. O cenário exclusivo de Google desligado foi pulado por condição, como na referência; o modo habilitado usa provedor local e não comprova login Google real. R01 conferiu 95 amostras, 28 completas durante ready/Playwright, seis leituras finais de restauração, nenhum evento OOM, nenhum uso de swap e nenhum reinício inesperado. Um erro de inventário ocorreu na limpeza, às 00:08:45 UTC de 14/11 (21:08:45 de 13/11 em São Paulo). Os 648 hashes antes/depois permaneceram iguais e corresponderam ao checkout revisado.

| Medida | Referência | Compacto testado |
| --- | ---: | ---: |
| Limites somados dos 16 serviços | 5.408 MiB | 3.504 MiB |
| Máximo da soma amostrada | 2.742,96 MiB | 2.526,59 MiB |
| Playwright | 28 aprovados / 5,2 min | 28 aprovados / 5,0 min |
| Restauração | 6 bancos / 55 tabelas / 14 consultas | 6 bancos / 55 tabelas / 14 consultas |

A redução observada foi **216,37 MiB (7,89%)**; a redução dos tetos foi 35,21%. São medidas diferentes. A pequena diferença de duração não comprova ganho de latência ou capacidade. Os arquivos detalhados e hashes dos brutos estão na [evidência S07](../S07-infra-integracao/memory-comparison.json).

## Parecer e próximos passos

**Aceite funcional local aprovado; capacidade para convivência na VPS ainda não aprovada.** Partner atingiu 402,11 MiB em teto de 416 MiB: apenas 13,89 MiB de folga (3,34%). Auth atingiu 403,93/448 MiB e Booking 331,58/368 MiB, também com margem limitada. A referência de Partner tinha pico de 385,54 MiB, portanto esse serviço não demonstrou economia nesta execução. Não reduzir mais esses tetos nem interpretar ausência de OOM em cinco minutos como segurança para carga sustentada.

Descontar o teto compacto da menor RAM disponível da VPS deixaria **1.314,41 MiB**, antes de crescimento do Setoriza e demais variações do host. Isso é uma projeção contábil, não reserva garantida. Os 27,09% de CPU steal observados também impedem atribuir todo risco à RAM. Ampliar somente a memória não corrige esse fator.

Antes de decidir por ampliação, o próximo experimento útil é medir os picos do Setoriza em janela representativa e testar carga sustentada do EasyPet localmente, com mais margem nos serviços Java — especialmente Partner — e dados/concorrência do piloto. Somente depois se define um orçamento e um preflight próprios para o perfil e se realiza um piloto compartilhado monitorado, comparando latência/erros do Setoriza, memória disponível, OOM e CPU antes/depois. Builds ficam fora da VPS. Restaurações e backups precisam de janela e orçamento separados. O preflight existente de 6.144 MiB não foi relaxado.

O overlay permanece opt-in para reprodução e avaliação; não é uma liberação de deploy. Não há evidência suficiente para afirmar que ampliar a RAM é necessário, nem para dispensar a ampliação com segurança. Nenhum serviço ou limite Setoriza foi alterado, nenhuma swap foi criada e nenhum EasyPet foi instalado na VPS.

R01 confirmou a remoção de containers, volumes, redes e imagens locais dos sete projetos envolvidos nas quatro tentativas (incluindo o projeto de restauração que falhou antes de criar recursos). As checagens de sintaxe dos cinco scripts JavaScript alterados/adicionados e do coletor Python passaram.

## Versionamento e conferência final

Instrumentação e perfil experimental registrados em `0357321`, sem alterar os arquivos medidos. Compose base + rede do host + compacto conferidos novamente: 16 serviços, 3.504 MiB, swap desabilitado, frontend somente em `127.0.0.1:18080` e rede SMTP interna. Os oito hashes dos dois brutos, dois logs e quatro snapshots publicados conferiram com a evidência S07. A auditoria dos 18 arquivos da mudança encontrou somente 260 alertas de hashes SHA-256 nos snapshots, nenhum outro achado e nenhuma correspondência com os segredos ou e-mails privados dos arquivos locais. Arquivos de ambiente e brutos privados não entram nos commits.
