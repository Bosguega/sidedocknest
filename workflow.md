

## Implementação de Command Bridge + System Bridge

Este workflow adiciona uma **camada de Bridge** entre o frontend e o backend do app.

Objetivo:

* centralizar chamadas `invoke`
* centralizar eventos do sistema
* reduzir dependência direta das APIs do Tauri
* preparar o projeto para futuras features (dock behavior, monitor detection, fullscreen auto-hide)

Tecnologia alvo: Tauri

---

# 📋 Regras importantes

O agente **NÃO deve**:

* alterar código Rust
* modificar stores existentes
* alterar lógica de componentes
* refatorar arquivos não mencionados

O agente deve **apenas**:

1. criar os arquivos de bridge
2. migrar **um hook específico**
3. manter todo comportamento existente

---

# 📁 Estrutura final esperada

Após este workflow a estrutura deverá conter:

```id="4y1n3f"
src
 ├ bridge
 │   ├ commands.ts
 │   └ system.ts
 │
 ├ hooks
 │   └ useTraySync.ts
```

---

# 1️⃣ Criar pasta bridge

Criar pasta:

```id="6f1z9c"
src/bridge
```

---

# 2️⃣ Criar Command Bridge

Criar arquivo:

```id="7l2g6a"
src/bridge/commands.ts
```

Conteúdo:

```ts id="b33q0t"
import { invoke } from "@tauri-apps/api/core";

export const commands = {
  openFile: (path: string) =>
    invoke("open_file", { path }),

  openFileLocation: (path: string) =>
    invoke("open_file_location", { path }),

  extractIcon: (path: string) =>
    invoke("extract_icon", { path }),

  resolveShortcut: (path: string) =>
    invoke("resolve_shortcut", { path }),

  getMonitorInfo: () =>
    invoke("get_active_monitor_info"),

  pathExists: (path: string) =>
    invoke("path_exists", { path }),

  listStartMenuItems: () =>
    invoke("list_start_menu_items")
};
```

Este arquivo **centraliza todas as chamadas invoke**.

---

# 3️⃣ Criar System Bridge

Criar arquivo:

```id="zcm7kq"
src/bridge/system.ts
```

Conteúdo:

```ts id="q1h6kp"
import { listen } from "@tauri-apps/api/event";

export const systemBridge = {

  onTrayToggleSide: (handler: () => void) =>
    listen("tray-toggle-side", handler),

  onTrayToggleTheme: (handler: () => void) =>
    listen("tray-toggle-theme", handler),

  onTrayToggleAutostart: (handler: () => void) =>
    listen("tray-toggle-autostart", handler)
};
```

Este arquivo **centraliza eventos do sistema**.

---

# 4️⃣ Migrar hook useTraySync

Arquivo alvo:

```id="q5r1l0"
src/hooks/useTraySync.ts
```

Adicionar import:

```ts id="n4u2bg"
import { systemBridge } from "../bridge/system";
```

---

# 5️⃣ Substituir listeners

Substituir chamadas diretas de:

```id="o3sl1e"
listen("tray-toggle-side")
```

por:

```id="1tf1lw"
systemBridge.onTrayToggleSide()
```

---

Substituir:

```id="2tsqvt"
listen("tray-toggle-theme")
```

por:

```id="q1fq84"
systemBridge.onTrayToggleTheme()
```

---

Substituir:

```id="3bdgje"
listen("tray-toggle-autostart")
```

por:

```id="r0z9ku"
systemBridge.onTrayToggleAutostart()
```

---

# 6️⃣ Exemplo do novo uso

Antes:

```ts id="4mb1ub"
await listen("tray-toggle-side", () => {
```

Depois:

```ts id="y2e6bc"
await systemBridge.onTrayToggleSide(() => {
```

---

# 7️⃣ Nenhuma outra mudança deve ocorrer

Confirmar que **nenhum outro comportamento foi alterado**:

* stores continuam iguais
* toast continua funcionando
* eventos do tray continuam funcionando
* lógica de side/theme/autostart permanece igual

---

# 8️⃣ Teste após implementação

Executar:

```id="xtb8ls"
npm run dev
```

Testar:

1️⃣ alterar lado da sidebar pelo tray
2️⃣ alterar tema pelo tray
3️⃣ ativar/desativar autostart

Confirmar que:

```id="8f6z2g"
✔ eventos continuam funcionando
✔ toasts aparecem normalmente
✔ estado continua sendo salvo
```

---

# 9️⃣ Benefícios da mudança

Após esse workflow o projeto ganha:

```id="l7mp1u"
centralização de APIs Tauri
código frontend mais limpo
facilidade de refatoração
preparação para novos módulos
```

---


