# 🛠️ SideDockNest — Workflow 01

## Full Height + Edge Position

Este documento define as alterações necessárias para que a janela do **SideDockNest**:

* ocupe **100% da altura do monitor**
* fique **sempre colada na borda da tela**
* **não altere nenhuma outra funcionalidade existente**


---

# 📋 Regras importantes

O agente **NÃO deve**:

* alterar comandos existentes
* modificar `tray`
* alterar plugins
* modificar `invoke_handler`
* alterar arquivos do frontend
* refatorar o código

O agente deve **apenas inserir um bloco de código no setup()**.

---

# 📁 Arquivo alvo

```
src-tauri/src/lib.rs
```

---

# 1️⃣ Adicionar imports necessários

No topo do arquivo localizar os imports existentes e adicionar:

```rust
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};
```

Se algum desses imports já existir **não duplicar**.

---

# 2️⃣ Localizar função `run()`

Encontrar:

```rust
pub fn run()
```

Dentro dela localizar o builder:

```rust
tauri::Builder::default()
```

---

# 3️⃣ Localizar bloco `setup`

Encontrar:

```rust
.setup(|app| {
```

---

# 4️⃣ Inserir código de controle de janela

**Imediatamente após a abertura do setup**, inserir o seguinte bloco:

```rust
// ===== SIDEDOCKNEST WINDOW SIZE + POSITION CONTROL =====

let window = app.get_webview_window("main").unwrap();

if let Some(monitor) = window.current_monitor().unwrap() {

    let monitor_size = monitor.size();
    let monitor_position = monitor.position();

    let sidebar_width = 220;
    let sidebar_height = monitor_size.height;

    window.set_size(Size::Physical(
        PhysicalSize {
            width: sidebar_width,
            height: sidebar_height,
        }
    ))?;

    window.set_position(Position::Physical(
        PhysicalPosition {
            x: monitor_position.x,
            y: monitor_position.y,
        }
    ))?;
}

// ===== END SIDEDOCKNEST WINDOW CONTROL =====
```

---

# 5️⃣ Estrutura final esperada

O bloco `setup` deverá ficar semelhante a:

```rust
.setup(|app| {

    // window control block
    ...

    if cfg!(debug_assertions) {
        ...
    }

    tray::create_tray(app)?;

    Ok(())
})
```

A ordem do restante do código **não deve ser alterada**.

---

# 6️⃣ Resultado esperado

Após iniciar o aplicativo:

```
npm run tauri dev
```

A janela deve:

✔ ocupar **100% da altura da tela**
✔ iniciar **colada na borda esquerda**
✔ manter largura **220px**
✔ manter todas as funcionalidades existentes

Visual esperado:

```
┌ Sidebar (220px) │ Desktop
│                 │
│                 │
│                 │
│                 │
│                 │
│                 │
└─────────────────┘
```

---

# 7️⃣ Critérios de validação

Confirmar que:

* o app inicia normalmente
* o tray continua funcionando
* atalhos globais continuam funcionando
* drag & drop continua funcionando
* a sidebar ocupa a altura total do monitor

---

# 8️⃣ O que **não deve mudar**

Esses comportamentos devem permanecer intactos:

* `alwaysOnTop`
* `transparent`
* `skipTaskbar`
* `dragDropEnabled`
* system tray
* comandos Tauri existentes

---


