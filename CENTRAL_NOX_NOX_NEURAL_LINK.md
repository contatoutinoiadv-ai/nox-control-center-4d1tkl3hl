# CENTRAL NOX · NOX NEURAL LINK

## 1. Visão Geral e Arquitetura

O **NOX NEURAL LINK** é o módulo operacional central de comunicação por voz e texto entre o usuário e o ecossistema de inteligências da **Central NOX**. Ele não atua como agente humano fictício, persona ou repositório passivo de arquivos, mas sim como um canal de comando neural e roteamento de alta disponibilidade.

### Componentes Principais

1. **Palco Neural 3D (`NeuralBrainCanvas.tsx`)**:
   - Geometria do cérebro com ~2000 nós partículas, ~4200 sinapses com pulsos luminescentes viajantes e poeira estelar de profundidade.
   - Pós-processamento com `UnrealBloomPass` e interpolação contínua e suave entre os 4 estados funcionais:
     - `idle` (Ciano `#00e5ff`, pulso suave 1.3, rotação tranquila);
     - `listening` (Verde `#00ff9d`, pulso 2.4, resposta dinâmica a bandas de áudio);
     - `thinking` (Dourado `#ffd700`, pulso 6.5, rotação acelerada e cintilação de nós);
     - `speaking` (Violeta `#d946ef`, pulso 3.2, deformação de envelope espectral).
   - Suporte nativo a `prefers-reduced-motion` (desativa rotações e efeitos de aceleração física).
   - Dimensionamento restrito ao container via `ResizeObserver` (nunca se apropria da viewport global).
   - Destruição completa de geometrias, materiais, texturas, pass de bloom e renderizador WebGL ao desmontar o módulo, evitando qualquer vazamento de memória ou duplicação de canvas.

2. **Osciloscópio 2D de Base (`NeuralOscilloscope.tsx`)**:
   - Canvas 2D renderizado sob o palco, com renderização de ondas de áudio do microfone durante a escuta, envelope modulado durante a fala e harmônicos senoidais em repouso e processamento.

3. **Controles e Painéis Internos (`NeuralOverlayControls.tsx`)**:
   - **Cabeçalho Interno**: Título técnico, descrição operacional e badges com status reais do sistema (`COMUNICAÇÃO ONLINE`, `ROTEAMENTO DISPONÍVEL`, `VOZ DISPONÍVEL`, `AGENTES DISPONÍVEIS`).
   - **Pílula de Estado**: Indicação em tempo real de prontidão operacional (`AGUARDANDO`, `OUVINDO`, `PROCESSANDO`, `RESPONDENDO`, `MICROFONE BLOQUEADO`), com função de clique para interromper fala (barge-in).
   - **Botão FAB de Microfone**: Controle circular ergonômico no centro inferior do palco para iniciar e encerrar captação de voz, interromper fala da IA ou acompanhar o estado do reconhecimento.
   - **Painel de Registros (Histórico)**: Gaveta interna com lista de mensagens da sessão (diferenciando usuário e IA), entrada manual de texto para ambientes silenciosos ou dispositivos sem microfone e botão de limpeza de sessão.
   - **Painel de Parâmetros (Configurações)**: Seleção de voz de síntese (priorizando pt-BR), ajuste de velocidade (0.7x a 1.4x), tom de fala (0.6 a 1.4), ativação de modo sentinela com wake word ("assistente" / "nox") e chave de desenvolvimento local opcional.

---

## 2. Decisão de Backend e Roteamento de IA

### Proxy Seguro Server-Side (`/backend/v1/nox/neural/message`)

- **Segurança Crítica**: Nenhuma chave de API de produção é armazenada no código frontend nem em variáveis de ambiente expostas no build.
- O backend PocketBase (`pocketbase/hooks/nox_neural_message.js`) recebe as requisições autenticadas e utiliza os segredos disponíveis no servidor (`SKIP_AI_GATEWAY_URL` e `SKIP_AI_GATEWAY_API_KEY` ou `GEMINI_API_KEY`) para rotear as mensagens para o Google Gemini.
- O endpoint aplica sanitização rigorosa anti-prompt-injection, filtrando scripts, tags e instruções maliciosas.
- Todas as interações pelo canal neural são registradas de forma auditável na coleção `audit_logs` do PocketBase com categoria `sistema`.

### Modo de Desenvolvimento (Chave Local)

- Para testes isolados ou desenvolvimento offline, o usuário pode configurar uma chave local Gemini no painel de parâmetros do núcleo. Esse modo é sinalizado claramente na interface através de um badge de alerta visual (`MODO DEV (CHAVE LOCAL)`), garantindo que desenvolvedores estejam cientes de que estão utilizando uma credencial client-side.

---

## 3. Acessibilidade e Ciclo de Vida

- **Navegação por Teclado**: Foco gerenciável em todos os botões, atalho `Escape` para interrupção imediata de fala (barge-in) e `aria-live` na pílula de estado para leitura por tecnologias assistivas.
- **Barge-in Múltiplo**: A fala da IA pode ser interrompida a qualquer momento por:
  1. Clique em qualquer área fora dos painéis ou no botão circular;
  2. Pressionamento da tecla `Escape`;
  3. Falar alto ao microfone (detecção de RMS acima de threshold no analisador de áudio).
- **Isolamento de Estilos**: Não utiliza `position: fixed` sobre a tela inteira nem `overflow: hidden` na raiz do documento. O layout permanece contido no container `<Outlet />` da Central NOX, mantendo a barra de navegação lateral (`NoxSidebar`) e o topo (`NoxTopbar`) sempre visíveis e operantes.

---

## 4. Próximos Passos Recomendados

1. **Roteamento de Agentes Especializados**:
   - Conectar o seletor `agentTarget` com os agentes já cadastrados no backend (como o Agente Sentinela para triagem de diários e o Lex Tempus para interpretação de atos processuais).
2. **Streaming Server-Sent Events (SSE)**:
   - Implementar streaming de tokens via SSE no endpoint `/backend/v1/nox/neural/message` para redução de latência percebida em frases longas.
3. **Persistência de Sessão em Banco de Dados**:
   - Opcionalmente persistir os registros de conversa do Neural Link em coleção própria no PocketBase vinculada ao usuário para auditoria e histórico multidispositivo.
