# Correções e Melhorias — SideDockNest

Documento gerado após análise estática completa do codebase.  
Todas as correções e melhorias listadas abaixo foram **aplicadas automaticamente**.

---

## Índice

1. [Erros Confirmados pelos Diagnósticos](#1-erros-confirmados-pelos-diagnósticos)
2. [Problemas de Lógica e Arquitetura](#2-problemas-de-lógica-e-arquitetura)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Qualidade de Código e UX](#4-qualidade-de-código-e-ux)
5. [Melhoria de Ícones — Base64 → Cache em Disco](#5-melhoria-de-ícones--base64--cache-em-disco)
6. [Sumário de Arquivos Modificados](#6-sumário-de-arquivos-modificados)
7. [Workflow de Validação Pós-Correção](#7-workflow-de-validação-pós-correção)

---

## 1. Erros Confirmados pelos Diagnósticos

### 1.1 `useDragDrop.ts:14` — Explicit `any` desnecessário
- **Problema:** `useToastStore((s: any) => s.addToast)` — a anotação `any` bypassa a tipagem do store.
- **Correção:** Removida a anotação. TypeScript infere o tipo corretamente.
- **Arquivo:** `src/hooks/useDragDrop.ts`

### 1.2 `Sidebar.tsx:178` — `let` onde deveria ser `const`
- **Problema:** `let targetStackId` nunca é reatribuído após a declaração.
- **Correção:** Refatorado para `const` com tipagem explícita `string | null`.
- **Arquivo:** `src/components/dock/Sidebar.tsx`

### 1.3 `Sidebar.tsx:215` — Type error: `string | undefined` passado onde `string` é esperado
- **Problema:** `over.id` é `UniqueIdentifier` (`string | number`) e `over.data.current?.stackId` é
  `string | undefined`. O TypeScript não fazia narrowing automático dentro do `if`, causando erro
  na chamada de `moveItem`.
- **Correção:** Introduzida variável intermediária `rawTargetId` com cast explícito, convertida para
  `string | null` via `String()` e `?? null`.
- **Arquivo:** `src/components/dock/Sidebar.tsx`

### 1.4 `Sidebar.tsx:227` — Variável `e` capturada mas nunca usada no `catch`
- **Problema:** `catch (e)` com `e` ignorado; `noUnusedLocals` acusava erro.
- **Correção:** Adicionado `console.error` para não silenciar o erro.
- **Arquivo:** `src/components/dock/Sidebar.tsx`

### 1.5 `shortcutUtils.ts:53` — Variável `e` capturada mas nunca usada no `catch` externo
- **Problema:** O `catch (e)` externo em `processFile` capturava o erro mas nunca o referenciava.
- **Correção:** Substituído por `catch` sem binding (TypeScript 4.0+).
- **Arquivo:** `src/utils/shortcutUtils.ts`

### 1.6 `commands.rs:37-38` — Imports `base64` não utilizados dentro de `extract_icon`
- **Problema:** `use base64::engine::general_purpose::STANDARD` e `use base64::Engine` eram importados
  dentro da função, mas `windows_icons` já retornava base64 — os imports eram desnecessários.
  Geravam 2 warnings do compilador Rust.
- **Correção:** Removidos os dois `use` internos e o comentário morto `// use base64::Engine`.
- **Arquivo:** `src-tauri/src/commands.rs`  
  *(Obs: a melhoria de ícones descrita na seção 5 usa os imports corretamente depois desta correção.)*

### 1.7 `useGlobalHotkeys.ts:35` — Diretiva `eslint-disable` obsoleta
- **Problema:** `// eslint-disable-line react-hooks/exhaustive-deps` no `useEffect` com `[]`.
  O ESLint já reportava que a diretiva não tinha efeito.
- **Correção:** Comentário removido.
- **Arquivo:** `src/hooks/useGlobalHotkeys.ts`

---

## 2. Problemas de Lógica e Arquitetura

### 2.1 Lógica de posicionamento duplicada — `lib.rs` vs `commands.rs`
- **Problema:** O bloco de startup em `lib.rs` calculava e aplicava tamanho/posição da janela com
  código idêntico ao de `commands::update_window_bounds`. Qualquer mudança precisaria ser feita
  em dois lugares.
- **Correção:** O bloco de startup agora chama `commands::update_window_bounds(window.clone(), false, side)`
  diretamente. Os imports `PhysicalPosition`, `PhysicalSize`, `Position`, `Size` foram removidos
  de `lib.rs` (usados apenas no código duplicado).
- **Arquivos:** `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`

### 2.2 `isValid` persistido no storage — estado stale no startup
- **Problema:** O campo `isValid` é transiente (sempre recomputado por `checkPaths()` ao carregar),
  mas era salvo junto com os stacks no `dock-data.json`. Isso causava um breve intervalo de estado
  stale na próxima inicialização.
- **Correção:** `saveToStore` agora cria uma cópia de cada item com `delete saved.isValid` antes de
  persistir. O campo nunca mais é gravado em disco.
- **Arquivo:** `src/stores/dockStore.ts`

### 2.3 `useDragDrop.ts` — Guard `isSettingUp` frágil com `setup()` async
- **Problema:** O `isSettingUp` ref era zerado no cleanup síncrono, mas `setup()` era async.
  No StrictMode do React, o cleanup rodava antes que `unlisten` fosse atribuído, causando
  potencial memory leak.
- **Correção:** Substituído pelo padrão `active` flag + `.then()`: se o componente desmontar antes
  da Promise resolver, `fn()` é chamado imediatamente para fazer o unlisten.
- **Arquivo:** `src/hooks/useDragDrop.ts`

### 2.4 `useWindowPosition.ts` — Timer `isResizing` vazava entre re-execuções do effect
- **Problema:** O `setTimeout` de 100ms que resetava `isResizing.current` era criado sem ser
  rastreado. Quando `side` ou `isExpanded` mudava e o effect re-executava, o timer anterior
  ainda estava em voo e poderia resetar o flag no meio do novo ciclo.
- **Correção:** O timer é armazenado em `resizeTimerRef` e cancelado com `clearTimeout` tanto
  no início de cada novo `updatePosition` quanto no cleanup do effect.
- **Arquivo:** `src/hooks/useWindowPosition.ts`

### 2.5 `addStack` retornava `void` — callers usavam `.at(-1)` frágil
- **Problema:** Dois lugares diferentes precisavam do ID da stack recém-criada e faziam
  `useDockStore.getState().stacks.at(-1)?.id` logo após `addStack()`. Frágil.
- **Correção:** `addStack` agora retorna `string` (o ID criado). Todos os callers foram atualizados.
- **Arquivos:** `src/stores/dockStore.ts`, `src/hooks/useDragDrop.ts`, `src/components/dock/Sidebar.tsx`

### 2.6 `getMonitorInfo` / `get_active_monitor_info` — código morto
- **Problema:** `getMonitorInfo` estava definido na bridge TypeScript e o comando correspondente
  registrado em `lib.rs`, mas nenhum componente ou hook o chamava.
- **Correção:** Removidos da bridge TypeScript, de `commands.rs` e do `invoke_handler` em `lib.rs`.
- **Arquivos:** `src/bridge/commands.ts`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`

### 2.7 `lib.rs` — `.unwrap()` em código crítico de startup
- **Problema:** `app.get_webview_window("main").unwrap()` causaria panic sem mensagem útil.
- **Correção:**
  - `get_webview_window("main")` → `.expect("Main window 'main' must be defined in tauri.conf.json")`
  - `app_config_dir()` → `if let Ok(config_dir) = ...` (elimina o `.ok()` desnecessário)
  - O bloco de posicionamento foi eliminado e substituído pela chamada ao comando reutilizável (2.1).
- **Arquivo:** `src-tauri/src/lib.rs`

### 2.8 `tray.rs` — `.unwrap()` no ícone da tray
- **Problema:** `app.default_window_icon().unwrap()` causaria panic se o ícone não estivesse configurado.
- **Correção:** Substituído por `.expect("Default window icon not configured in tauri.conf.json")`.
- **Arquivo:** `src-tauri/src/tray.rs`

### 2.9 `if cfg!(debug_assertions)` compila plugin em release
- **Problema:** `if cfg!(...)` é avaliado em runtime. O crate `tauri-plugin-log` era compilado em
  todas as builds incluindo release, aumentando o binário sem benefício.
- **Correção:** Substituído por `#[cfg(debug_assertions)]` (atributo de compilação condicional),
  que exclui o bloco inteiro do binário de release.
- **Arquivo:** `src-tauri/src/lib.rs`

---

## 3. Problemas de Performance

### 3.1 `DockItem.tsx` — Subscrevia o array completo de `stacks`
- **Problema:** `const { stacks, renameItem, reorderItems } = useDockStore()` fazia o componente
  re-renderizar toda vez que qualquer stack ou item mudava no dock inteiro, apenas para fazer um
  `stacks.find(s => s.id === stackId)`.
- **Correção:** Substituído por três seletores finos:
  ```ts
  const stack       = useDockStore((s) => s.stacks.find((st) => st.id === stackId));
  const renameItem  = useDockStore((s) => s.renameItem);
  const reorderItems = useDockStore((s) => s.reorderItems);
  ```
  O componente agora só re-renderiza quando a própria stack muda.
- **Arquivo:** `src/components/dock/DockItem.tsx`

### 3.2 `Stack.tsx` — Subscrevia o array completo de `stacks`
- **Problema:** Mesmo padrão: `useDockStore()` sem seletor, causando re-renders em cascata.
- **Correção:** Seletores finos para cada ação e para os dados necessários:
  ```ts
  const stackIndex  = useDockStore((s) => s.stacks.findIndex((st) => st.id === stack.id));
  const stackCount  = useDockStore((s) => s.stacks.length);
  const toggleStack = useDockStore((s) => s.toggleStack);
  // ... demais ações individualmente
  ```
- **Arquivo:** `src/components/dock/Stack.tsx`

---

## 4. Qualidade de Código e UX

### 4.1 Lógica de toast do auto-start duplicada
- **Problema:** O mesmo bloco (`await toggleAutoStart()` + `addToast(...)`) estava copiado em
  `Sidebar.tsx` e `useTraySync.ts`.
- **Correção:** O toast foi movido para dentro de `toggleAutoStart` no `configStore`. Callers externos
  foram simplificados.
- **Arquivos:** `src/stores/configStore.ts`, `src/components/dock/Sidebar.tsx`, `src/hooks/useTraySync.ts`

### 4.2 UX inconsistente — tray mostrava toasts, botões in-app não mostravam
- **Problema:** Clicar em "Switch Theme" / "Switch Side" na tray mostrava toast. Os botões
  equivalentes dentro das configurações do Sidebar não mostravam.
- **Correção:** `setSide` e `setTheme` no `configStore` agora emitem toasts internamente via
  `useToastStore.getState().addToast(...)`. Qualquer caller recebe feedback automaticamente.
- **Arquivo:** `src/stores/configStore.ts`

### 4.3 `configStore.ts` — `setSide` e `setTheme` salvavam sem debounce
- **Problema:** Ao contrário do `dockStore` (debounce de 500ms), o `configStore` chamava
  `saveConfig()` imediatamente a cada mudança, podendo disparar múltiplas escritas concorrentes.
- **Correção:** Adicionado `debouncedSaveConfig` com janela de 300ms.
- **Arquivo:** `src/stores/configStore.ts`

### 4.4 `Sidebar.tsx` — `key={idx}` no mapa de apps do Start Menu
- **Problema:** Índice do array como key — quando a lista é filtrada, o React não consegue
  reconciliar os itens corretamente.
- **Correção:** `key={app.path}` — o caminho é único por entrada.
- **Arquivo:** `src/components/dock/Sidebar.tsx`

### 4.5 `useGlobalHotkeys.ts` — `"Alt+Space"` hardcoded no meio do hook
- **Problema:** String literal sem possibilidade de reuso ou referência externa.
- **Correção:** Extraído para `export const TOGGLE_SHORTCUT = "Alt+Space"` no topo do arquivo.
- **Arquivo:** `src/hooks/useGlobalHotkeys.ts`

### 4.6 `Modal.tsx` — Sem suporte à tecla Escape, sem ARIA
- **Problema:** O Modal não fechava ao pressionar Escape, não tinha `role="dialog"`, `aria-modal`
  nem `aria-label`.
- **Correção:**
  - Adicionado `useEffect` que registra `keydown` para fechar no Escape.
  - Adicionados `role="dialog"`, `aria-modal="true"` e `aria-label={title}`.
  - Adicionado `aria-label="Close"` no botão de fechar.
- **Arquivo:** `src/components/common/Modal.tsx`

### 4.7 `Cargo.toml` — Crate `image` declarado mas nunca usado
- **Problema:** `image = "0.25"` nas dependências Windows sem nenhum `use image` no código Rust.
  Aumentava o tempo de compilação e o tamanho do binário.
- **Correção:** Removido de `[target.'cfg(windows)'.dependencies]`.
- **Arquivo:** `src-tauri/Cargo.toml`

### 4.8 `tray.rs` — Clique esquerdo no ícone da tray não fazia nada
- **Problema:** `.show_menu_on_left_click(false)` sem handler para o clique esquerdo.
- **Correção:** Adicionado `.on_tray_icon_event()` que emite `"tray-toggle-expand"` no clique
  esquerdo. O `Sidebar.tsx` escuta via `systemBridge.onTrayToggleExpand` e alterna `isExpanded`.
- **Arquivos:** `src-tauri/src/tray.rs`, `src/bridge/system.ts`, `src/components/dock/Sidebar.tsx`

### 4.9 `globals.css` — Classe utilitária `.mb-4` isolada
- **Problema:** Uma única classe utilitária no meio de um CSS de componentes — inconsistência
  de abordagem (o projeto não usa Tailwind).
- **Correção:** Removida de `globals.css`. Substituída por `style={{ marginBottom: "1rem" }}` inline.
- **Arquivos:** `src/styles/globals.css`, `src/components/dock/Sidebar.tsx`

### 4.10 `lib.rs` — Chave `"side"` hardcoded sem documentação do acoplamento
- **Problema:** A string `"side"` era lida manualmente do JSON em Rust e também usada no
  `configStore.ts` em TypeScript. Se a chave mudasse em um lado, quebrava silenciosamente no outro.
- **Correção:** Adicionado comentário: `// NOTE: the key "side" must stay in sync with configStore.ts.`
- **Arquivo:** `src-tauri/src/lib.rs`

---

## 5. Melhoria de Ícones — Base64 → Cache em Disco

### Problema

O sistema anterior armazenava ícones como strings base64 completas diretamente no `dock-data.json`:

| Aspecto | Impacto |
|---------|---------|
| Tamanho no JSON | ~3–15 KB **por ícone** em texto base64 |
| Memória no Zustand | Todos os blobs carregados no estado React |
| Tempo de parse | JSON volumoso deserializado a cada startup |
| Re-extração | Ícone extraído novamente a cada item adicionado |
| Renderização | `<img src="data:image/png;base64,...">` — blobs inline no DOM |

### Solução implementada

**Arquitetura de três camadas:**

```
[Windows Shell API]
       │
       ▼
windows_icons::get_icon_base64_by_path()
       │  (apenas na primeira vez — cache miss)
       ▼
{app_cache_dir}/icons/{fnv1a_hash(path)}.png   ← cache persistente em disco
       │
       ▼
protocolo  icon://localhost/{hash}.png          ← servido pelo Rust
       │   (convertFileSrc() resolve URL por plataforma)
       ▼
<img src={convertFileSrc(item.icon, "icon")}>   ← zero base64 no DOM
```

### Detalhes técnicos

#### Hash determinístico (FNV-1a 64-bit)
- **Por quê não `DefaultHasher`:** usa seed aleatório — hashes mudam a cada execução, inutilizando o cache
- **FNV-1a:** determinístico, fast, sem dependência externa, implementado inline em 8 linhas
- **Formato do filename:** `{:016x}.png` — 16 chars hexadecimais lowercase + `.png`
- **Case-insensitive:** paths normalizados para lowercase antes do hash (Windows é case-insensitive)

#### Protocolo `icon://` customizado (Tauri `register_uri_scheme_protocol`)
- Registrado em `lib.rs` via `.register_uri_scheme_protocol("icon", |ctx, req| {...})`
- Lê `{app_cache_dir}/icons/{filename}` e serve como `image/png`
- Header `Cache-Control: public, max-age=31536000, immutable` — o browser não re-requisita o mesmo hash
- Retorna 404 se o arquivo não existir (fallback para ícone SVG via `onError`)
- No Windows (WebView2): wry remapeia `icon://` → `http://icon.localhost/` automaticamente

#### `convertFileSrc(filename, "icon")`
- Função do `@tauri-apps/api/core` — sem permissão extra necessária
- macOS/Linux: `icon://localhost/{hash}.png`
- Windows: `http://icon.localhost/{hash}.png`
- Trata a diferença de plataforma automaticamente

#### Fluxo de cache
```
extractIcon(path) chamado
       │
       ├─ Cache HIT?  → retorna filename imediatamente (< 1ms)
       │
       └─ Cache MISS  → extrai via windows_icons
                      → decodifica base64 → bytes PNG
                      → salva em {cache_dir}/icons/{hash}.png
                      → retorna filename
```

#### Campo `DockItem.icon`
- **Antes:** `string` com blob base64 completo (~4000+ chars)
- **Depois:** `string` com filename do hash (`"a3f1b2c4d5e6f708.png"` — 20 chars)
- O JSON do storage reduz **>99%** do tamanho dos dados de ícones

### Migração automática de dados existentes

No `loadFromStore`, ícones são validados com a regex `/^[0-9a-f]{16}\.png$/`:
- **Novo formato** (hash filename) → mantido
- **Formato antigo** (base64 blob, URL, qualquer outra coisa) → `undefined`

Em seguida, `refreshIcons()` é chamado como fire-and-forget:
- Re-extrai ícones em paralelo para todos os itens sem ícone válido
- Na primeira execução pós-migração: cache frio → extração leva 1–5s para ~20 itens
- Nas execuções seguintes: cache quente → todos os ícones carregam instantaneamente
- Salva automaticamente no JSON ao concluir

### Fallback robusto

`DockItem.tsx` tem tratamento de erro duplo:
1. **`onError` no `<img>`:** se `icon://` retornar 404 (cache deletado manualmente), mostra ícone SVG
2. **`useEffect` no `item.icon`:** reseta o estado de erro quando um novo ícone é atribuído

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src-tauri/src/commands.rs` | `extract_icon` recebe `AppHandle`, implementa FNV-1a, salva PNG, retorna filename |
| `src-tauri/src/lib.rs` | Registro do protocolo `icon://` via `register_uri_scheme_protocol` |
| `src/stores/dockStore.ts` | Tipo `refreshIcons`, migração em `loadFromStore`, `refreshIcons` fire-and-forget |
| `src/components/dock/DockItem.tsx` | `convertFileSrc`, `onError` state, reset effect |
| `src/types/dock.ts` | Documentação JSDoc do novo formato do campo `icon` |

---

## 6. Sumário de Arquivos Modificados

| Arquivo | Seções aplicadas |
|---------|-----------------|
| `src/hooks/useDragDrop.ts` | 1.1, 2.3, 2.5 |
| `src/hooks/useGlobalHotkeys.ts` | 1.7, 4.5 |
| `src/hooks/useWindowPosition.ts` | 2.4 |
| `src/hooks/useTraySync.ts` | 4.1 (cleanup) |
| `src/stores/dockStore.ts` | 2.2, 2.5, 5 |
| `src/stores/configStore.ts` | 4.1, 4.2, 4.3 |
| `src/bridge/commands.ts` | 2.6 |
| `src/bridge/system.ts` | 4.8 |
| `src/utils/shortcutUtils.ts` | 1.5 |
| `src/types/dock.ts` | 5 (documentação) |
| `src/components/common/Modal.tsx` | 4.6 |
| `src/components/dock/DockItem.tsx` | 3.1, 5 |
| `src/components/dock/Stack.tsx` | 3.2 |
| `src/components/dock/Sidebar.tsx` | 1.2, 1.3, 1.4, 2.5, 4.1, 4.4, 4.8, 4.9 |
| `src/styles/globals.css` | 4.9 |
| `src-tauri/src/commands.rs` | 1.6, 2.1, 2.6, 5 |
| `src-tauri/src/lib.rs` | 2.1, 2.7, 2.9, 4.10, 5 |
| `src-tauri/src/tray.rs` | 2.8, 4.8 |
| `src-tauri/Cargo.toml` | 4.7 |

**Total: 19 arquivos modificados | 29 correções + 1 melhoria de sistema**

---

## 7. Workflow de Validação Pós-Correção

Execute os passos abaixo na ordem indicada para confirmar que tudo está funcional.

### Passo 1 — Verificar diagnósticos TypeScript e ESLint

```bash
cd sidedocknest
npm run build
```

Resultado esperado: **zero erros de compilação TypeScript**.

```bash
npm run lint
```

Resultado esperado: **zero erros e zero warnings de ESLint**.

---

### Passo 2 — Verificar compilação Rust

```bash
cd sidedocknest/src-tauri
cargo check
```

Resultado esperado: **zero erros, zero warnings**.

```bash
cargo clippy -- -D warnings
```

Resultado esperado: **zero warnings** após as correções de `unwrap` e imports.

---

### Passo 3 — Testar em modo desenvolvimento

```bash
cd sidedocknest
npm run tauri dev
```

Checklist de testes manuais:

#### 3.1 Posicionamento inicial
- [ ] O dock inicia colapsado (22px de largura) na borda correta (esquerda por padrão)
- [ ] Ao expandir via hover, o dock ocupa a altura total da área de trabalho

#### 3.2 Hover / colapso
- [ ] Passar o mouse sobre o dock expande após ~150ms
- [ ] Remover o mouse colapsa após ~400ms
- [ ] Com o modal de Import aberto, remover o mouse **não** colapsa o dock

#### 3.3 Toast — consistência entre tray e UI
- [ ] Clicar no botão de tema (☀️) no Sidebar → toast "Switched to light/dark theme"
- [ ] Clicar no botão de lado (↔) no Sidebar → toast "Moved to left/right"
- [ ] Usar "Switch Theme" no menu da tray → mesmo toast
- [ ] Usar "Switch Side" no menu da tray → mesmo toast
- [ ] Ativar/desativar auto-start pelo botão ⚡ → toast "Auto-start enabled/disabled"
- [ ] Ativar/desativar auto-start pelo menu da tray → mesmo toast (sem duplicação)

#### 3.4 Clique esquerdo na tray
- [ ] Clicar com botão esquerdo no ícone da tray → dock expande/colapsa alternadamente

#### 3.5 Modal
- [ ] Abrir o modal de Import → pressionar **Escape** fecha o modal
- [ ] Clicar fora do modal (no overlay) fecha o modal
- [ ] O modal possui `role="dialog"` (verificar via DevTools → Elements)

#### 3.6 Sistema de ícones — primeiro uso (cache frio)
- [ ] Arrastar um arquivo .exe para o dock → ícone aparece após extração (1–3s)
- [ ] Verificar que `{LOCALAPPDATA}\com.sidedocknest.app\icons\` contém arquivos `.png`
- [ ] Fechar e reabrir o app → ícone carrega instantaneamente (cache quente)
- [ ] Verificar que o `dock-data.json` contém `"icon": "a3f1b2c4d5e6f708.png"` (hash curto, NÃO base64)

#### 3.7 Migração de ícones (se houver dados anteriores com base64)
- [ ] Ao abrir o app com dados antigos, ícones aparecem em branco brevemente
- [ ] Após 1–5s, os ícones são re-extraídos e aparecem progressivamente
- [ ] Na próxima abertura, todos os ícones carregam instantaneamente

#### 3.8 Drag & drop
- [ ] Arrastar um arquivo .exe → item adicionado com ícone e toast
- [ ] Arrastar o mesmo arquivo novamente → toast "already in this stack" (sem duplicata)
- [ ] Arrastar múltiplos arquivos de uma vez → cada um adicionado individualmente com ícone

#### 3.9 Fallback de ícone
- [ ] Deletar manualmente um arquivo `.png` de `{LOCALAPPDATA}\com.sidedocknest.app\icons\`
- [ ] O item correspondente exibe o ícone SVG de fallback (AppWindow/Folder/File)
- [ ] Adicionar o item novamente → ícone é re-extraído e cacheado

#### 3.10 Persistência sem `isValid`
- [ ] Abrir `{LOCALAPPDATA}\com.sidedocknest.app\dock-data.json`
- [ ] Confirmar que **não há campo `isValid`** nos itens salvos
- [ ] Confirmar que o campo `icon` é um hash curto (`"[0-9a-f]{16}.png"`) e não base64

#### 3.11 Reordenação e movimento
- [ ] Drag & drop de stack reordena corretamente
- [ ] Drag & drop de item entre stacks move corretamente
- [ ] Botões "Move Up" / "Move Down" no context menu funcionam

#### 3.12 Validação de caminhos
- [ ] Items com caminho inválido exibem ícone ⚠️ e tooltip "PATH NOT FOUND"

---

### Passo 4 — Build de release

```bash
cd sidedocknest
npm run tauri build
```

Verificar:
- [ ] Build conclui sem erros
- [ ] `tauri-plugin-log` **não aparece** nas dependências do release (`cargo tree --release`)
- [ ] O binário gerado em `src-tauri/target/release/` funciona corretamente

---

### Passo 5 — Verificação de tamanho do storage

Após usar o app por alguns minutos:

1. Abrir `%LOCALAPPDATA%\com.sidedocknest.app\dock-data.json`
2. Confirmar que nenhum item possui campo `"isValid"`
3. Confirmar que os campos `"icon"` são curtos (ex: `"a3f1b2c4d5e6f708.png"`) e não strings longas de base64
4. Comparar o tamanho do arquivo com versões anteriores — deve ser **drasticamente menor** se havia ícones armazenados

---

## Notas Técnicas

### Acoplamento cross-language documentado
O campo `"side"` em `src-tauri/src/lib.rs` (lido via JSON manual no startup