# Mission S01

Modelo: gpt-6.1-sol. Reasoning: high.

1. Leia ../README.md, spec.md, o roadmap e os arquivos atuais do seu escopo; preserve alterações locais existentes.
2. Publique contracts.md cedo, com contratos concretos da sua entrega e dependências externas. Leia contracts/status das sprints dependentes quando necessário.
3. Implemente as entregas independentes da spec. Entregue código funcional e testes relevantes, não somente planejamento.
4. Para frontend, preserve o visual existente, decomponha por responsabilidade e reutilize UI. Consulte o contrato S01; registre novos padrões e pedidos de galeria em integration.md.
5. Integre apenas contratos reais disponíveis. Arquivos compartilhados pertencem a S01 (frontend) ou S07 (infra); registre solicitações, sem editá-los.
6. Execute validação local apropriada sem disputar ambientes compartilhados. Não iniciar suite E2E integrada fora de S07.
7. Atualize status.md com o que foi implementado, comandos e resultados, riscos e pendências. Se depender de outro chat, conclua sua parte independente e registre exatamente o desbloqueio necessário.

Seu escopo: Frontend/src/components/, Frontend/src/index.css, Frontend/src/App.tsx, Frontend/src/routes/, Frontend/src/pages/design-system/, Frontend/docs/, Frontend/package.json e lockfile.

Aceite: Galeria funcional no navegador, componentes demonstram variantes reais, build aprovado e padrão visual existente preservado. Não marcar integrações de outras sprints como concluídas antes de testá-las.
