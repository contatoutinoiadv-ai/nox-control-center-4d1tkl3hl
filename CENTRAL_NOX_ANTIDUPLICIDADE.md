# CENTRAL NOX — SISTEMA DE ANTIDUPLICIDADE COM BLOQUEIO ATIVO (V2)

## 1. Visão Geral e Objetivo

O Sistema de Antiduplicidade com Bloqueio Ativo do NOX Control Center impede que publicações e tarefas em duplicidade ingressem no ecossistema operacional ou no banco de dados.

Diferente de sistemas que apenas sinalizam duplicatas a posteriori, o motor NOX atua **preventivamente na entrada** (ingestão CSV, Sentinela DJEN, criação de tarefas pelo operador ou por automações), rejeitando ou quarentenando os registros redundantes com mensagem de erro explícita contendo o motivo **"DUPLICATA"**.

---

## 2. Arquitetura de Detecção por Fingerprint Criptográfico

Para evitar colisões indesejadas e garantir que publicações parecidas não sofram falso-positivo, a detecção **não se baseia em coincidência de dígitos** ou correspondências parciais frágeis. Empregamos fingerprints canônicos determinísticos:

### 2.1. Fingerprint de Publicações (`generatePublicationFingerprint`)

A chave unívoca de uma publicação combina:

1. **Número do Processo Normalizado:** extração e padronização dos dígitos no formato CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO`.
2. **Tribunal / Órgão Julgador:** normalizado em caixa alta.
3. **Data de Disponibilização:** no padrão ISO `YYYY-MM-DD`.
4. **Hash Criptográfico do Teor (`teorHash`):** o texto da intimação é limpo de acentuação, espaços extras, quebras de linha e caracteres invisíveis antes de calcular o hash determinístico FNV-1a.
5. **Destinatários / Partes:** normalizados sem acentos.

Formato canônico gerado:

```
PUB|<numeroProcesso>|<tribunal>|<dataDisponibilizacao>|<hashTeor>|<destinatarios>
```

**Propriedades validadas:**

- **Mesmo teor + processos diferentes:** NÃO é duplicata. É permitido com sucesso (ex.: petições padrão ou despachos em processos conexos).
- **Mesmo processo + mesmo teor + datas diferentes:** NÃO é duplicata. É permitido (ex.: reiterações em momentos distintos).
- **Mesmo processo + mesmo teor + mesma data + mesmo destinatário:** DUPLICATA confirmada e bloqueada.

### 2.2. Fingerprint de Tarefas (`generateTaskFingerprint`)

A chave canônica de uma tarefa avalia:

- Se originada de uma publicação (`communicationId`):
  ```
  TASK|COMM:<commId>|TYPE:<tipoOuRegra>|RESP:<responsavel>
  ```
- Se tarefa autônoma:
  ```
  TASK|PROC:<processo>|TITLE:<tituloNormalizado>|RESP:<responsavel>
  ```

Impede que operadores ou rotinas automáticas criem múltiplas tarefas com o mesmo objetivo e responsável para uma mesma intimação ou processo.

---

## 3. Comportamento e Bloqueio Ativo por Ponto de Entrada

1. **Ingestão CSV (`validateImportedRow` em `src/services/csvEngine.ts`):**
   - Na validação de cada linha do lote CSV, se a chave canônica já existir no sistema ou no lote atual, a linha é marcada imediatamente com severidade `critico`, motivo `DUPLICATA` e encaminhada para quarentena/rejeição com aviso explícito ao operador.
2. **Ingestão de Comunicações do Sentinela / DJEN (`addDjenCommunications` em `dataStore.ts`):**
   - O lote é submetido ao crivo do motor de antiduplicidade. Publicações redundantes são descartadas na entrada e registradas no log de bloqueio.
3. **Criação de Tarefas (`addTask` em `dataStore.ts` e `TasksView.tsx`):**
   - Retorna `{ success: false, reason: 'DUPLICATA' }` caso a tarefa já exista para a mesma origem, exibindo notificação toast de erro explicativa ao operador.

---

## 4. Auditoria e Telemetria Dedicada

As tentativas bloqueadas são gravadas em armazenamento dedicado isolado (`nox_antiduplicity_audit_v2`), sem poluir a auditoria processual ou jurídica da cadeia de custódia.
Cada entrada registra:

- `timestamp` ISO da tentativa
- `entityType` (`PUBLICACAO` | `TAREFA` | `IMPORTACAO_CSV`)
- `identifier` (número do processo ou ID de referência)
- `fingerprint` canônico
- `source` (ex.: `CSV_INGESTION`, `DJEN_OR_SENTINELA_INGESTION`, `TASK_CREATE`)
- `reason`: estritamente `"DUPLICATA"`
- `blockedCount`: total cumulativo de tentativas bloqueadas para aquele fingerprint

---

## 5. Suíte de Testes Navegável

Disponível em `/configuracoes` sob a ação **"Bateria Antiduplicidade"** (`AntiDuplicityTestSuite`):

- `TEST_AD_1`: Mesma publicação 2x = 1 registro aceito, 1 bloqueado como DUPLICATA.
- `TEST_AD_2`: Mesma publicação 5x = 1 registro aceito, 4 bloqueios cumulativos com contagem auditada.
- `TEST_AD_3`: Publicação com teor idêntico em processo diferente = NÃO é duplicata (aceito sem colisão).
- `TEST_AD_4`: Tarefa para a mesma publicação/origem = bloqueada preventivamente.
- `TEST_AD_5`: Publicação legítima parecida com datas distintas = aceita.
- `TEST_AD_6`: Auditoria de bloqueios dedicada mantida sem poluir auditoria jurídica.
