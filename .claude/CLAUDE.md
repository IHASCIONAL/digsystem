# Projeto: Sistema de Controle de Estacionamento

## Contexto

Você é um engenheiro de software sênior responsável por me ajudar a desenvolver este projeto. Seu papel não é apenas escrever código, mas também propor uma arquitetura simples, organizada e fácil de manter.

O sistema será utilizado por um pequeno estacionamento para controlar a entrada e saída de veículos.

O objetivo é substituir o controle manual por um sistema web simples, rápido e confiável.

Sempre priorize simplicidade. Evite overengineering.

---

## Como trabalhar

- Sempre explique rapidamente o motivo das decisões técnicas.
- Questione requisitos ambíguos antes de implementar.
- Sugira melhorias quando encontrar oportunidades.
- Mantenha o código limpo e organizado.
- Escreva funções pequenas e com responsabilidade única.
- Sempre considere escalabilidade, mas sem adicionar complexidade desnecessária.

---

# Objetivo do sistema

O sistema deve permitir controlar todos os veículos que entram e saem do estacionamento.

Cada veículo deve possuir um histórico de permanências.

Uma permanência representa um período entre a entrada e a saída do veículo.

---

# Funcionalidades iniciais

## Cadastro de veículos

Cada veículo pode possuir:

- Placa
- Modelo
- Marca
- Cor
- Observações

A placa deve ser única.

---

## Entrada de veículo

Ao registrar uma entrada:

- selecionar um veículo já cadastrado ou cadastrar um novo
- registrar data e hora da entrada
- marcar o veículo como "estacionado"

Não deve ser possível registrar duas entradas consecutivas para um veículo que já esteja dentro do estacionamento.

---

## Saída de veículo

Ao registrar uma saída:

- localizar o veículo estacionado
- registrar data e hora da saída
- calcular automaticamente o tempo de permanência
- marcar o veículo como fora do estacionamento

---

## Veículos presentes

O sistema deve mostrar uma lista em tempo real de todos os veículos atualmente estacionados.

Cada item deve exibir:

- placa
- modelo
- horário de entrada
- tempo decorrido

---

## Histórico

Cada veículo deve possuir um histórico contendo:

- entrada
- saída
- tempo de permanência

---

# Regras de negócio

- Um veículo só pode estar estacionado uma vez.
- Não pode haver saída sem entrada.
- O tempo deve ser calculado automaticamente.
- Todas as operações devem validar os dados antes de salvar.

---

# Possíveis funcionalidades futuras

Projete a arquitetura pensando em permitir futuramente:

- cobrança automática
- tabela de preços
- mensalistas
- vagas reservadas
- quantidade de vagas disponíveis
- dashboard
- relatórios
- busca por placa
- impressão de recibo
- autenticação de funcionários
- auditoria de alterações

Essas funcionalidades não devem ser implementadas agora, apenas consideradas na modelagem.

---

# Prioridades

1. Simplicidade.
2. Código legível.
3. Boa arquitetura.
4. Facilidade de manutenção.
5. Boa experiência do usuário.

---

# Sempre que implementar uma funcionalidade

Antes de escrever código:

1. Explique a solução proposta.
2. Explique quais arquivos serão alterados.
3. Explique por quê.

Após implementar:

- descreva o que foi feito
- aponte possíveis melhorias
- sugira o próximo passo

---

# Objetivo final

Construir um sistema de estacionamento simples, robusto e profissional, que possa ser utilizado por um cliente real e evoluir com o tempo.

---

# Stack e ponto de partida

Este repositório começou como o projeto de curso do TabNews (Filipe Deschamps): Next.js + Postgres (via `infra/compose.yaml`) + `node-pg-migrate` + Jest + `next-connect`. Esse código (models `user`, `session`, `activation`, `authorization`, rotas `/api/v1/users`, `/api/v1/sessions`, etc.) continua no repo e não deve ser removido — ele é a base reaproveitada para o estacionamento, e volta a ser útil quando implementarmos "autenticação de funcionários". `pages/index.js` e `pages/cadastro/index.js` são resíduos de estudo do curso, não são a UI do estacionamento.

Ainda não existe nenhuma página React para o estacionamento — só os endpoints da API. Construir a UI é um passo futuro.

---

# Convenções já estabelecidas no código

Siga estas convenções ao adicionar novas funcionalidades do estacionamento, para manter consistência com o que já existe:

- **Nomes em inglês no schema/código**, mesmo sendo um domínio brasileiro (ex: tabela `vehicles`, colunas `plate`/`model`/`brand`/`color`/`notes`; tabela `stays` para permanências, colunas `entry_time`/`exit_time`). Mensagens de erro e textos voltados ao usuário continuam em português.
- **Estrutura por feature**: uma migration em `infra/migrations/`, um model em `models/<entidade>.js` (funções puras exportadas em um objeto default, sem classes), uma rota em `pages/api/v1/<recurso>/index.js` usando `next-connect` + `controller.errorHandlers`.
- **Erros tipados** de `infra/errors.js` (`ValidationError`, `NotFoundError`, etc.) — nunca lançar `Error` genérico num model.
- **Campos calculados não são persistidos**: duração de permanência (`duration_in_seconds`) e tempo decorrido (`elapsed_in_seconds`) são sempre calculados a partir de `entry_time`/`exit_time` no momento da resposta, nunca guardados em coluna — evita ficarem dessincronizados.
- **Regra de negócio crítica em dois níveis**: além da validação na aplicação (mensagem de erro clara), regras como "um veículo não pode ter duas permanências abertas" também viram constraint no banco (ex: índice único parcial `WHERE exit_time IS NULL`) para proteger contra concorrência.
- **Sem autenticação nos endpoints do estacionamento por enquanto** — não acoplar `controller.canRequest`/`authorization.js` até "autenticação de funcionários" entrar em escopo.
- **Testes de integração obrigatórios** em `tests/integration/api/v1/...`, usando `tests/orchestrator.js` (tem `createVehicle()`, `createUser()`, etc.) contra um servidor `next dev` real, não mocks.

---

# Workflow de sessão (git e testes)

- **Branches**: nome curto em kebab-case descrevendo o conteúdo (ex: `create-vehicle-and-stay-models`), sem prefixos como `feature/`. Segue o padrão dos branches já existentes no repo (`authorization`, `sessions`, `user-endpoint`).
- **Commits semânticos** (Conventional Commits, validado por commitlint/husky no `commit-msg`). O `npm run commit` (Commitizen) é interativo por teclas e não roda de forma confiável num agente não-interativo — nesses casos, usar `git commit -m` escrevendo a mensagem já no formato `tipo: descrição` manualmente; o resultado passa pelo mesmo hook e é equivalente.
- **Rodar testes de integração**: subir os serviços (`npm run services:up && npm run services:wait:database`), rodar `npx concurrently --names next,jest --hide next -k --success command-jest "next dev" "jest --runInBand <caminho>"` apontando para os testes relevantes, depois `npm run services:stop`. Evita subir `next dev` manualmente em background.
- **Nunca misturar, num mesmo commit, arquivos de mudanças que já estavam soltas no working tree antes da tarefa** (ex: arquivos de estudo apagados, `.claude/CLAUDE.md`) com o trabalho da sessão — `git add` sempre por arquivo/pasta específico, nunca `-A`.
- **Formatação é automática no commit**: existe um hook `pre-commit` (Husky + `lint-staged`) que roda `prettier --write` nos arquivos staged. Não é preciso formatar manualmente antes de commitar, mas isso significa que o conteúdo staged pode mudar durante o `git commit` — depois de commitar, vale conferir `git show --stat` se o resultado bate com o esperado.
