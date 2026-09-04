# Central NOX Design System V2

Guia Oficial de Engenharia Visual, Tokens, Tipografia, Componentes e Padroes Operacionais da Central NOX V2.

## 1. Principios Fundamentais

1. Rigor e Sobriedade Juridica: O ambiente visual prioriza o foco operacional do advogado e do controlador. Eliminam-se excessos decorativos, degradês chamativos ou efeitos que prejudiquem a legibilidade.
2. Contraste e Densidade de Informacao: Plataforma voltada para analise de processos complexos, calculos de prazos e fluxo de triagem. Suporta visualizacao densa em tabelas e paineis sem poluir o campo visual.
3. Consistencia Semantica de Cores: As cores transmitem significados criticos estritos. Vermelho/Rose para prazos fatais ou preclusao; Amarelo/Amber para atencao ou quarentena; Verde/Emerald para resolucao e sucesso; Ciano/Cyan para links ativos e identidade institucional; Roxo/Purple para inteligencia artificial (Oraculo NOX).
4. Acessibilidade e Navegabilidade: Todos os elementos interativos possuem estados visiveis de foco, rotulos semanticos ARIA e contraste compativel com padroes WCAG AA.
5. Imutabilidade e Rastreabilidade: Toda informacao critica exibe sua origem, hash de integridade e timestamp de ingestao.

---

## 2. Tokens CSS Globais

Todos os tokens institucionais da NOX V2 possuem prefixo `--nox-` e estao declarados em `src/main.css` e centralizados em `src/design-system/tokens/designTokens.ts`.

### Paleta de Cores

- `--nox-color-bg-base`: `#030712` (Fundo base da aplicacao)
- `--nox-color-bg-surface`: `#0a101f` (Superficie de cards e conteudos)
- `--nox-color-bg-card`: `rgba(10, 16, 31, 0.75)` (Cards com efeito glass blur)
- `--nox-color-primary`: `#06b6d4` (Ciano primario institucional)
- `--nox-color-primary-dark`: `#0891b2` (Ciano escuro para hovers)
- `--nox-color-border-base`: `#1e293b` (Borda neutra sutil)
- `--nox-color-border-hover`: `#334155` (Borda de realce ao passar o mouse)
- `--nox-color-text-primary`: `#f8fafc` (Texto com alta legibilidade)
- `--nox-color-text-secondary`: `#94a3b8` (Texto secundario informativo)
- `--nox-color-text-muted`: `#64748b` (Rotulos e legendas)
- `--nox-color-danger`: `#f43f5e` (Alertas criticos e prazos fatais)
- `--nox-color-warning`: `#f59e0b` (Prazos em atencao e quarentena)
- `--nox-color-success`: `#10b981` (Itens resolvidos e homologados)
- `--nox-color-info`: `#8b5cf6` (Oraculo NOX e analise de inteligencia)

### Raios de Borda (Border Radius)

- `--nox-radius-sm`: `0.375rem` (6px)
- `--nox-radius-md`: `0.5rem` (8px)
- `--nox-radius-lg`: `0.75rem` (12px)
- `--nox-radius-xl`: `1rem` (16px)

### Tipografia e Fontes

- `--nox-font-sans`: Inter, system-ui, sans-serif
- `--nox-font-mono`: JetBrains Mono, Fira Code, monospace

---

## 3. Componentes do Design System

Todos os componentes estao disponiveis via importacao direta de `@/design-system`:

### 3.1 Cabecalho Padronizado (`NoxPageHeader`)

- Propriedades: `title`, `description`, `icon`, `badge`, `breadcrumbs`, `actions`.
- Uso: Deve iniciar todas as paginas principais da Central NOX garantindo alinhamento e hierarquia uniformes.

### 3.2 Cards e Metricas (`NoxCard`, `NoxMetricCard`)

- `NoxCard`: Variantes `glass`, `surface`, `highlight`. Suporta prop `interactive` com transicao suave de escala e borda.
- `NoxMetricCard`: Exibe valor, rotulo, icone tematico, variacao percentual ou status (up, down, neutral) e indicador semantico (`cyan`, `danger`, `warning`, `success`, `default`).

### 3.3 Botoes Padronizados (`NoxButton`)

- Variantes: `primary` (Ciano escuro destacado), `secondary` (Superficie com borda), `outline` (Borda sutil), `ghost` (Transparente), `danger` (Acoes destrutivas).
- Tamanhos: `sm`, `md`, `lg`.
- Suporte a `loading` com spinner nativo e `icon`.

### 3.4 Formularios e Entradas (`NoxForms`)

- `NoxInput`: Campo de texto estilizado com foco em ciano e contraste adequado.
- `NoxSearchInput`: Campo especializado com icone de lupa integrado e estilo compacto.
- `NoxTextarea`: Campo multilinhas de alta densidade.

### 3.5 Badges de Estado Operacional (`NoxStatusBadge`)

- Estados suportados:
  - `ONLINE`: Conexao ativa do Sentinela ou servicos em tempo real.
  - `SYNC`: Processo de sincronizacao em andamento.
  - `PENDENTE`: Aguardando acao ou revisao humana.
  - `PROCESSADO`: Tratamento concluido pelo motor.
  - `RESOLVIDO`: Conclusao homologada.
  - `BLOQUEADO`: Prazo fatal iminente ou quarentena impeditiva.
  - `CANCELADO`: Ato cancelado ou descontinuado.
  - `RASCUNHO`: Em elaboracao ou preliminar.

### 3.6 Tabelas de Alta Densidade (`NoxDenseTable`)

- Componente de renderizacao de matrizes de dados complexas com cabecalho monoespacado, suporte a ordenacao por coluna, customizacao de celulas e alinhamento semantico.

### 3.7 Estados Visuais (`NoxEmptyState`, `NoxErrorState`)

- `NoxEmptyState`: Mensagens de contexto ricas orientadas a solucao (ex: "Nenhum prazo judicial ativo" acompanhado do botao de acao correspondente).
- `NoxErrorState`: Tratamento elegante sem exibir stack trace cru ou jargoes indecifraveis.

### 3.8 Inteligencia Artificial Juridica (`NoxIntelligence`)

- `NoxAiSignature`: Identificacao do modelo de IA e versao.
- `NoxInsight`: Destaque de padrao jurisprudencial ou tese.
- `NoxRecommendation`: Sugestao acionavel com botao de aplicacao imediata.
- `NoxRisk`: Alerta de risco preclusivo ou temporal com acao de mitigacao.

---

## 4. Shell Global e Realtime

O shell da aplicacao (`NOXAppShell`, `NoxSidebar`, `NoxTopbar`) e integrado diretamente ao `src/components/Layout.tsx`.

### Conectividade em Tempo Real Real (SSE / PocketBase)

O topo da interface exibe o status operacional real da conexao:

- `ONLINE (SSE)`: Conectividade ativa e recebendo eventos do backend PocketBase.
- `SINCRONIZANDO`: Ingestao ou mutacao em transito.
- `RECONECTANDO`: Tentativa de restabelecimento automatico.
- `OFFLINE`: Queda de rede detectada pelo navegador.
- Notificador de "NOVA ATUALIZACAO": Sinaliza a chegada de atualizacoes sem recarregar a pagina inteira forcadamente.

---

## 5. Showcase Interno

O catalogo vivo de demonstracao esta acessivel pela rota protegida `/design-system`, permitindo testar:

- Paleta de cores e tokens CSS
- Hierarquia tipografica
- Variantes e estados de botoes
- Entradas de formulario
- Badges operacionais
- Metricas e cards
- Tabelas densas com fixtures isoladas
- Estados de erro e vazio
- Componentes de inteligencia do Oraculo NOX
- Modais e caixas de dialogo

---

## 6. Boas Praticas e Anti-Patterns

### Boas Praticas

1. Utilizar sempre `NoxPageHeader` no topo de qualquer tela.
2. Utilizar `NoxMono` para numeros de processo CNJ, hashes e valores monetarios.
3. Fornecer sempre uma acao clara em telas de vazio (`actionLabel` e `onAction`).
4. Preservar o contraste semantico: nunca usar cores de alerta critico para decoracao estetica.

### Anti-Patterns

1. Nunca utilizar mensagens genericas como "Sem dados" ou "Erro 500".
2. Nunca alterar formulas de calculo ou regras de negocio durante ajustes de layout.
3. Nao empregar componentes fora do padrao em telas essenciais de controladoria.
4. Nao omitir o feedback visual ao usuario em operacoes assincronas.
