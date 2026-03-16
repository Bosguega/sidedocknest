# SideDockNest

Launcher lateral minimalista para Windows.

---

# Visão Geral

**SideDockNest** é um launcher vertical para Windows que vive como uma **barra lateral compacta** na borda da tela.

Ele permite organizar:

- Aplicativos
- Arquivos
- Pastas

em **grupos expansíveis (stacks)**, acessíveis rapidamente ao passar o mouse sobre a barra.

A aplicação suporta **Drag & Drop do Explorer do Windows**, permitindo adicionar itens rapidamente ao dock.

Objetivo principal:

> Criar um launcher leve, rápido e visualmente discreto para acesso frequente a apps e arquivos.

---

# Conceito de Interface

O SideDockNest funciona como uma **barra lateral inteligente** que possui dois estados.

---

# Estado Compacto (Colapsado)

Quando o usuário não está interagindo com o dock.

Características:

- Barra extremamente fina
- Ocupa toda a altura da tela
- Mostra apenas o nome do aplicativo

Visual:

```
S
i
d
e
D
o
c
k
N
e
s
t
```

Esse texto funciona como **indicador visual da presença do dock**.

---

# Estado Expandido

Quando o usuário passa o mouse sobre a barra.

Características:

- A barra se expande horizontalmente
- As stacks ficam visíveis
- Usuário pode interagir com os itens

Exemplo conceitual:

```
┌───────────────┐
│ Dev ▸         │
│ Web ▸         │
│ Tools ▸       │
│               │
│ 📁 Temp       │
│ 🎵 Music      │
│               │
│ ➕ Add Stack  │
└───────────────┘
```

A expansão deve ocorrer com **animação suave**.

---

# Posicionamento da Barra

A barra pode ser posicionada em:

- lado esquerdo da tela
- lado direito da tela

Ocupa **100% da altura da tela**.

Inicialmente o dock funcionará como **overlay**, sem reservar espaço da área de trabalho.

---

# Dimensões e Medidas

## Estado Colapsado

| Propriedade | Valor |
|---|---|
| Largura | 20px |
| Altura | 100% da tela |
| Opacidade | 0.6 |
| Background | Semi-transparente com blur |

## Estado Expandido

| Propriedade | Valor |
|---|---|
| Largura | 220px |
| Altura | 100% da tela |
| Opacidade | 0.95 |
| Background | Semi-transparente com blur mais intenso |

## Animações

| Animação | Duração | Easing | Delay |
|---|---|---|---|
| Expandir dock | 200ms | ease-out | 150ms (hover delay) |
| Recolher dock | 300ms | ease-in | 400ms (leave delay) |
| Expandir stack | 150ms | ease-out | 0ms |
| Recolher stack | 150ms | ease-in | 0ms |
| Hover em item | 100ms | ease | 0ms |

O **delay de 150ms para expandir** evita expansões acidentais ao passar o mouse rapidamente.
O **delay de 400ms para recolher** dá tempo ao usuário para retornar à barra sem que ela feche.

---

# Estrutura de Conteúdo

Dentro do dock existem dois tipos principais de elementos.

---

# Stacks

Stacks são grupos organizadores de itens.

Exemplo:

```
Dev ▸
Web ▸
Tools ▸
```

Quando expandidas:

```
Dev ▾
 ├ VSCode
 ├ Git Bash
 └ Terminal
```

Stacks podem ser:

- expandidas
- recolhidas

## Ciclo de Vida das Stacks (CRUD)

### Criar Stack

```
Usuário clica em "➕ Add Stack"
↓
Modal/input inline aparece
↓
Usuário digita nome da stack
↓
Stack criada com lista vazia de itens
↓
Persistência salva automaticamente
```

- Nome obrigatório (mínimo 1 caractere, máximo 30 caracteres)
- Ícone opcional (usando Lucide icons)
- Cor opcional (padrão: cor do tema)

### Renomear Stack

```
Duplo clique no nome da stack
↓
Nome vira input editável (inline)
↓
Enter confirma / Esc cancela
↓
Persistência atualizada
```

### Deletar Stack

```
Menu contextual da stack → "Delete Stack"
↓
Confirmação: "Delete stack 'Dev' and all items?"
↓
Stack e itens removidos
↓
Persistência atualizada
```

### Reordenar Stacks

- Stacks podem ser reordenadas via **drag** interno (arrastar pela handle)
- Itens dentro de uma stack também podem ser reordenados

### Limites

- Máximo de **20 stacks** por dock
- Máximo de **50 itens** por stack

---

# Itens

Itens representam recursos executáveis.

Podem ser:

- aplicativos (.exe)
- atalhos (.lnk)
- arquivos (qualquer extensão)
- pastas

Exemplo:

```
VSCode
Chrome
Spotify
```

Cada item deve exibir:

- **Ícone** extraído automaticamente (quando possível)
- **Nome** do item (extraído do nome do arquivo, editável)
- **Tooltip** com o path completo ao fazer hover

---

# Funcionalidades Principais

## Executar Aplicativo

Clique em um item executa o recurso associado.

Fluxo:

```
User click
↓
Frontend captura evento
↓
invoke("open_file", { path })
↓
Backend executa path via shell::open
↓
Aplicação abre
```

---

## Abrir Local do Arquivo

Itens possuem menu contextual.

Exemplo:

```
Right Click
↓
Open File Location
```

Abre a pasta onde o arquivo está localizado.

---

## Drag & Drop

Usuário pode arrastar itens diretamente do Explorer.

Suporte para:

- executáveis (.exe)
- atalhos (.lnk)
- arquivos
- pastas

Fluxo:

```
User arrasta item do Explorer
↓
Solta no dock (na stack desejada ou área geral)
↓
Evento onDrop capturado via Tauri drag-drop event
↓
Paths recebidos (array de strings)
↓
Para cada path:
  ├ Se .lnk → Resolver target via lnk crate no backend
  ├ Se .exe → Usar path diretamente
  └ Se outro → Usar path diretamente
↓
Backend extrai ícone do path resolvido
↓
Item criado com {name, path, type, icon}
↓
Adicionado à stack (ou nova stack criada)
↓
Persistência salva
```

### Detalhes Técnicos do Drag & Drop

- **Configuração Tauri**: `dragDropEnabled: true` no `tauri.conf.json`
- **Evento**: Escutar evento `tauri://drag-drop` no frontend via `listen()`
- **Resolução de .lnk**: Usar crate `lnk` no Rust para extrair o target path do atalho
- **Drop zone visual**: Área de drop destacada visualmente quando um drag está em andamento
- **Feedback**: Animação de confirmação ao soltar item com sucesso

---

# Extração de Ícones

Quando um item é adicionado:

```
Path recebido (já resolvido se era .lnk)
↓
invoke("extract_icon", { path })
↓
Backend usa windows-icons crate
  ├ SHGetFileInfo para obter HICON
  ├ Converter para RGBA bitmap
  └ Encodar como PNG base64
↓
Retorna string base64 do ícone
↓
Frontend armazena no campo icon do DockItem
↓
Ícone exibido via <img src="data:image/png;base64,..." />
```

### Estratégia de Cache

- Ícones são extraídos **uma única vez** ao adicionar o item
- O base64 é salvo diretamente na persistência (store)
- Se o ícone não puder ser extraído, usar ícone fallback baseado no tipo:
  - `.exe` → ícone de aplicativo genérico (Lucide: `AppWindow`)
  - `.lnk` → ícone de link (Lucide: `ExternalLink`)
  - pasta → ícone de pasta (Lucide: `Folder`)
  - arquivo → ícone de arquivo (Lucide: `File`)

### Dependências Rust para Ícones

```toml
[dependencies]
windows-icons = "1"
base64 = "0.22"
image = "0.25"
```

---

# Menu Contextual

## Menu de Item

```
Open                    → Executa o item
Open File Location      → Abre pasta do arquivo no Explorer
Edit Name               → Renomear item inline
─────────────────────
Remove from Dock        → Remove item da stack
```

## Menu de Stack

```
Rename                  → Renomear stack inline
─────────────────────
Delete Stack            → Remove stack e todos os itens (com confirmação)
```

## Menu do Dock (área vazia)

```
Add Stack               → Criar nova stack
─────────────────────
Settings                → Abrir configurações (lado, tema, auto-start)
```

---

# Stack Tecnológica

| Camada | Tecnologia | Versão Mínima |
|---|---|---|
| Core | Tauri | 2.x (estável) |
| Frontend | React | 18.x |
| Build Tool | Vite | 5.x |
| Estilo | Tailwind CSS | 3.x |
| Linguagem | TypeScript | 5.x |
| Estado | Zustand | 4.x |
| Ícones UI | Lucide React | latest |
| Persistência | tauri-plugin-store | 2.x |
| Ícones Win | windows-icons (Rust) | 1.x |
| Atalhos | lnk (Rust) | 0.5.x |

Sempre utilizar **versões estáveis mais recentes**.

---

# Dependências Rust (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
lnk = "0.5"
base64 = "0.22"
open = "5"

[target.'cfg(windows)'.dependencies]
windows-icons = "1"
image = "0.25"
```

---

# Dependências Frontend (package.json)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.0.0",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
```

---

# Configuração da Janela Tauri

## tauri.conf.json (seção windows)

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "SideDockNest",
        "width": 220,
        "height": 1080,
        "x": 0,
        "y": 0,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "dragDropEnabled": true,
        "visible": true,
        "focus": false
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### Detalhes da Configuração

| Propriedade | Valor | Motivo |
|---|---|---|
| `decorations` | `false` | Remove barra de título, borda |
| `transparent` | `true` | Permite fundo translúcido/blur |
| `alwaysOnTop` | `true` | Dock sempre visível sobre outras janelas |
| `skipTaskbar` | `true` | Não aparece na taskbar do Windows |
| `resizable` | `false` | Tamanho fixo controlado programaticamente |
| `dragDropEnabled` | `true` | Permite receber drag & drop do Explorer |
| `focus` | `false` | Não rouba foco de outras janelas ao interagir |

### Posicionamento Dinâmico

O posicionamento (esquerdo/direito) é controlado programaticamente:

```
App inicia
↓
Lê configuração de lado (left/right)
↓
Se left: x = 0
Se right: x = screen_width - dock_width
↓
Ajusta posição e altura via Tauri Window API
```

A altura é ajustada para `screen_height` dinamicamente na inicialização e ao detectar mudanças de resolução.

---

# System Tray

O SideDockNest deve ter um ícone na **bandeja do sistema** (system tray) para:

- Acesso rápido a configurações
- Opção de sair do aplicativo
- Indicar que o app está em execução

## Menu da System Tray

```
SideDockNest
─────────────────
[x] Auto-start with Windows
─────────────────
Side: Left | Right
─────────────────
Theme: Dark | Light
─────────────────
Quit
```

### Implementação

```rust
// Em main.rs
TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&tray_menu)
    .on_menu_event(handle_tray_event)
    .build(app)?;
```

Requer feature `tray-icon` habilitada no Cargo.toml.

---

# Estrutura de Projeto

```
sidedocknest/
├── src/
│
│   ├── components/
│   │   ├── dock/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Stack.tsx
│   │   │   ├── DockItem.tsx
│   │   │   └── ContextMenu.tsx
│   │   │
│   │   └── common/
│   │       ├── Icon.tsx
│   │       └── ConfirmDialog.tsx
│
│   ├── hooks/
│   │   ├── useDragDrop.ts
│   │   ├── useAutoStart.ts
│   │   ├── useContextMenu.ts
│   │   └── useWindowPosition.ts
│
│   ├── stores/
│   │   ├── configStore.ts
│   │   └── dockStore.ts
│
│   ├── types/
│   │   └── dock.ts
│
│   ├── utils/
│   │   ├── iconExtractor.ts
│   │   └── pathValidator.ts
│
│   ├── styles/
│   │   └── globals.css
│
│   ├── App.tsx
│   └── main.tsx
│
├── src-tauri/
│
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands.rs
│   │   ├── tray.rs
│   │   └── system/
│   │       ├── icon.rs
│   │       ├── launcher.rs
│   │       ├── shortcut.rs
│   │       └── registry.rs
│
│   ├── icons/
│   │   └── icon.png
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── postcss.config.js
└── PROJECT_PLAN.md
```

---

# Estrutura da Interface

Hierarquia de componentes React:

```
App
 └ Sidebar
     ├ Stack
     │   ├ DockItem
     │   └ DockItem
     │
     ├ AddStackButton
     │
     └ ContextMenu (portal, posicionado por coordenadas)
```

---

# Estrutura de Dados

```ts
export type DockItemType = "app" | "file" | "folder"

export type DockItem = {
  id: string
  name: string
  path: string
  type: DockItemType
  icon?: string       // base64 PNG do ícone extraído
  createdAt: number   // timestamp
}

export type DockStack = {
  id: string
  name: string
  items: DockItem[]
  isExpanded: boolean
  color?: string      // cor personalizada opcional
  createdAt: number
}

export type DockSide = "left" | "right"

export type AppTheme = "dark" | "light"

export type AppConfig = {
  side: DockSide
  theme: AppTheme
  autoStart: boolean
}
```

---

# Gerenciamento de Estado (Zustand)

## dockStore

Responsável por stacks e itens.

```ts
type DockState = {
  stacks: DockStack[]

  // Stack CRUD
  addStack: (name: string) => void
  removeStack: (stackId: string) => void
  renameStack: (stackId: string, newName: string) => void
  reorderStacks: (fromIndex: number, toIndex: number) => void
  toggleStack: (stackId: string) => void

  // Item CRUD
  addItem: (stackId: string, item: Omit<DockItem, "id" | "createdAt">) => void
  removeItem: (stackId: string, itemId: string) => void
  renameItem: (stackId: string, itemId: string, newName: string) => void
  reorderItems: (stackId: string, fromIndex: number, toIndex: number) => void
  moveItem: (fromStackId: string, toStackId: string, itemId: string) => void

  // Persistência
  loadFromStore: () => Promise<void>
  saveToStore: () => Promise<void>
}
```

---

## configStore

Responsável pelas configurações do app.

```ts
type ConfigState = {
  side: DockSide
  theme: AppTheme
  autoStart: boolean

  // Actions
  setSide: (side: DockSide) => void
  setTheme: (theme: AppTheme) => void
  setAutoStart: (enabled: boolean) => void

  // Persistência
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
}
```

---

# Persistência de Dados

## Tecnologia

Usar `tauri-plugin-store` (key-value store baseado em arquivo JSON).

## Arquivos de Persistência

| Arquivo | Conteúdo |
|---|---|
| `dock-data.json` | Stacks e itens (incluindo ícones base64) |
| `config.json` | Configurações (lado, tema, auto-start) |

## Local de Armazenamento

Os arquivos ficam no diretório de dados do app:
`%APPDATA%/com.sidedocknest.app/`

## Estratégia de Salvamento

- **Auto-save**: Salvar automaticamente após qualquer modificação (add/remove/edit)
- **Debounce**: Aplicar debounce de 500ms para evitar writes excessivos
- **Graceful exit**: Salvar ao fechar o app (via evento `tauri://close-requested`)
- **Load on startup**: Carregar dados do store na inicialização

## Exemplo de Estrutura do dock-data.json

```json
{
  "stacks": [
    {
      "id": "stack-1",
      "name": "Dev",
      "isExpanded": true,
      "color": null,
      "createdAt": 1710000000000,
      "items": [
        {
          "id": "item-1",
          "name": "VS Code",
          "path": "C:\\Program Files\\Microsoft VS Code\\Code.exe",
          "type": "app",
          "icon": "iVBORw0KGgo...",
          "createdAt": 1710000000000
        }
      ]
    }
  ]
}
```

---

# Comandos Tauri (Backend Rust)

## Lista de Comandos

### `open_file`

Abre um arquivo, pasta ou aplicativo usando o handler padrão do sistema.

```rust
#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    // Usa crate `open` para abrir com handler padrão do sistema
    open::that(&path).map_err(|e| format!("Failed to open: {}", e))
}
```

### `open_file_location`

Abre o Explorer na pasta que contém o arquivo, com o arquivo selecionado.

```rust
#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    // Executa: explorer.exe /select,"<path>"
    Command::new("explorer.exe")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| format!("Failed to open location: {}", e))?;
    Ok(())
}
```

### `extract_icon`

Extrai o ícone de um arquivo e retorna como base64 PNG.

```rust
#[tauri::command]
fn extract_icon(path: String) -> Result<String, String> {
    // Usa windows-icons para extrair HICON
    // Converte para PNG via image crate
    // Retorna base64 encoded string
}
```

### `resolve_shortcut`

Resolve o target path de um arquivo .lnk.

```rust
#[tauri::command]
fn resolve_shortcut(path: String) -> Result<String, String> {
    // Usa crate lnk para parsear o .lnk
    // Retorna o target path resolvido
    let shortcut = lnk::ShellLink::open(&path)
        .map_err(|e| format!("Failed to read shortcut: {}", e))?;
    shortcut
        .link_info()
        .and_then(|info| info.local_base_path().map(|p| p.to_string()))
        .ok_or_else(|| "Could not resolve shortcut target".to_string())
}
```

### `get_screen_size`

Retorna o tamanho da tela primária.

```rust
#[tauri::command]
fn get_screen_size(window: tauri::Window) -> Result<(u32, u32), String> {
    let monitor = window.primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No monitor found")?;
    let size = monitor.size();
    Ok((size.width, size.height))
}
```

## Registro dos Comandos

```rust
// Em lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::open_file_location,
            commands::extract_icon,
            commands::resolve_shortcut,
            commands::get_screen_size,
        ])
        .setup(|app| {
            tray::create_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

# Módulos Rust Detalhados

## system/icon.rs

Responsável por:

- Extrair ícone de `.exe` usando `windows-icons` crate
- Converter ícone para PNG bytes
- Encodar bytes em base64
- Retornar fallback se extração falhar

## system/launcher.rs

Responsável por:

- Abrir arquivos/apps com handler padrão (`open::that`)
- Abrir localização no Explorer (`explorer.exe /select,`)
- Validar se o path existe antes de executar

## system/shortcut.rs

Responsável por:

- Parsear arquivos `.lnk` usando crate `lnk`
- Extrair target path do atalho
- Retornar path resolvido ou erro descritivo

## system/registry.rs

Responsável por:

- Gerenciar auto-start via registro do Windows
- Chave: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- Adicionar/remover entrada "SideDockNest" com o path do executável

---

# Tema e Estilização

## Paleta de Cores

### Dark Theme (padrão)

```css
--bg-primary: hsla(220, 20%, 10%, 0.85);       /* fundo principal */
--bg-secondary: hsla(220, 20%, 15%, 0.9);       /* fundo de stacks */
--bg-hover: hsla(220, 30%, 25%, 0.8);           /* hover em itens */
--text-primary: hsla(0, 0%, 95%, 1);             /* texto principal */
--text-secondary: hsla(0, 0%, 70%, 1);           /* texto secundário */
--accent: hsla(210, 100%, 60%, 1);               /* cor de destaque */
--border: hsla(0, 0%, 100%, 0.08);               /* bordas sutis */
--drop-zone: hsla(210, 100%, 60%, 0.15);         /* área de drop */
```

### Light Theme

```css
--bg-primary: hsla(0, 0%, 98%, 0.9);
--bg-secondary: hsla(0, 0%, 95%, 0.95);
--bg-hover: hsla(220, 10%, 90%, 0.8);
--text-primary: hsla(220, 20%, 10%, 1);
--text-secondary: hsla(220, 10%, 40%, 1);
--accent: hsla(210, 100%, 50%, 1);
--border: hsla(0, 0%, 0%, 0.08);
--drop-zone: hsla(210, 100%, 50%, 0.1);
```

## Efeitos Visuais

- **Backdrop blur**: `backdrop-filter: blur(20px)` no fundo da sidebar
- **Glassmorphism**: Fundo semi-transparente + blur
- **Bordas sutis**: Usar `border: 1px solid var(--border)`
- **Sombras**: `box-shadow: 0 0 20px rgba(0,0,0,0.3)` na sidebar expandida
- **Transições**: Todas propriedades visuais com `transition` suave

## Fonte

- **Primária**: `Inter` (Google Fonts) — carregada via Tailwind ou link local
- **Fallback**: `system-ui, -apple-system, sans-serif`
- **Tamanho base**: 13px (compacto para sidebar)

## Transparência da Janela

- Requer `transparent: true` no Tauri config
- Body do HTML com `background: transparent`
- CSS do app gerencia o visual semi-transparente

---

# Tratamento de Erros

## Tipos de Erro

| Cenário | Comportamento |
|---|---|
| Path não existe mais | Exibir ícone de warning ⚠️ no item + tooltip "File not found" |
| Extração de ícone falha | Usar ícone fallback (Lucide icon baseado no tipo) |
| Falha ao abrir app | Toast notification: "Could not open [name]" (3s) |
| Falha ao salvar persistência | Toast notification: "Could not save data" + retry automático |
| .lnk com target inválido | Tratar como path normal (tentar abrir o .lnk diretamente) |
| Drag & drop com tipo inválido | Ignorar silenciosamente |
| Stack com nome duplicado | Permitir (IDs são únicos) |
| Store corrompido | Iniciar com dados padrão + log de warning |

## Feedback Visual

- **Toast notifications**: Mensagens temporárias no canto inferior (3s auto-dismiss)
- **Item inválido**: Ícone de warning + opacidade reduzida
- **Loading**: Skeleton/pulse animation enquanto ícone é extraído

---

# Fluxo de Execução do App

```
App inicia (main.rs)
↓
Tauri Builder configurado
  ├ Plugin Store registrado
  ├ Comandos registrados
  ├ System Tray criada
  └ Janela criada (transparent, borderless, always-on-top)
↓
Frontend carrega (main.tsx)
↓
Stores inicializadas
  ├ configStore.loadConfig() → lê config.json
  └ dockStore.loadFromStore() → lê dock-data.json
↓
Posição da janela ajustada
  ├ get_screen_size()
  └ Posiciona left ou right conforme config
↓
Sidebar renderizada (estado colapsado)
↓
Event listeners registrados
  ├ Drag & Drop (tauri://drag-drop)
  ├ Mouse enter/leave (hover handlers)
  └ Window resize (ajuste de altura)
↓
Usuário interage
  ├ Hover → expandir dock
  ├ Click em item → executar
  ├ Drop de arquivo → adicionar item
  └ Context menu → ações
```

---

# Fluxo de Interação do Usuário

## Expandir Dock

```
Mouse entra na barra colapsada
↓
Delay de 150ms (debounce hover)
↓
Dock expande com animação (200ms ease-out)
↓
Stacks ficam visíveis
```

---

## Recolher Dock

```
Mouse sai da área do dock expandido
↓
Delay de 400ms (grace period)
↓
Se mouse não retornou:
  Dock recolhe com animação (300ms ease-in)
↓
Mostra apenas "SideDockNest" vertical
```

---

## Abrir Aplicativo

```
User click em item
↓
invoke("open_file", { path })
↓
Aplicação executada pelo sistema
↓
Dock recolhe automaticamente (após 200ms)
```

---

## Adicionar Item via Drag & Drop

```
User arrasta arquivo do Explorer
↓
Hover sobre o dock → dock expande
↓
Drop zone da stack destino fica highlighted
↓
User solta o arquivo
↓
invoke("resolve_shortcut") se .lnk
↓
invoke("extract_icon", { path })
↓
Item criado e adicionado à stack
↓
Toast: "Added [name] to [stack]"
```

---

# Roadmap

## MVP [DONE]

- [x] Barra lateral funcional (colapsado/expandido)
- [x] Stacks expansíveis (criar, expandir, recolher)
- [x] Executar aplicativos (click → open)
- [x] Persistência de configuração e dados
- [x] Tema dark
- [x] System tray com opção de sair
- [x] Janela transparent, always-on-top, borderless

---

## v1 [DONE]

- [x] Drag & Drop do Explorer
- [x] Menu contextual (itens + stacks)
- [x] Extração automática de ícones
- [x] Configuração de lado da tela (left/right)
- [x] Renomear stacks e itens
- [x] Reordenar stacks e itens (via botões Up/Down)
- [x] Light theme
- [x] Validação de paths (items com path inválido)
- [x] Toast notifications

---

## v1.1 [DONE]

- [x] Sincronização da System Tray com o estado da UI
- [x] Validação automática de caminhos a cada 5 min
- [x] Correção de bugs de duplicação de eventos (Drag & Drop)
- [x] Auto-start com Windows (via Plugin Autostart)

---

## v2 (Concluído)

- [x] Hotkeys globais (Alt+Space para toggle dock + focus search)
- [x] Busca de aplicativos (campo de busca no topo do dock)
- [x] Importar apps do Start Menu (botão de faíscas + modal de seleção)
- [x] Reordenação drag interno (drag & drop real entre stacks e itens via @dnd-kit)
- [x] Suporte a múltiplos monitores (detecção de monitor atual e posicionamento relativo)

---

# Testes

## Testes Unitários (Rust)

- Resolução de atalhos `.lnk`
- Extração de ícones (mock com arquivo de teste)
- Validação de paths
- Registro de auto-start

Framework: `cargo test` (built-in)

## Testes do Frontend

- Renderização de componentes (Sidebar, Stack, DockItem)
- Estado do Zustand (add/remove/reorder)
- Lógica de hover/expand/collapse

Framework: `vitest` + `@testing-library/react`

## Testes Manuais (checklist)

- [x] Drag & Drop de .exe do Explorer
- [x] Drag & Drop de .lnk do Explorer
- [x] Drag & Drop de pasta do Explorer
- [x] Expandir/recolher dock via hover
- [x] Expandir/recolher stack via click
- [x] Executar app via click
- [x] Menu contextual → Open File Location
- [x] Menu contextual → Remove from Dock
- [x] Persistência: fechar e reabrir app mantém dados
- [x] System Tray funcional e sincronizado
- [x] Posicionar dock no lado direito
- [x] Trocar tema dark ↔ light
- [x] App não aparece na taskbar
- [x] Auto-start alternado com sucesso

---

# Princípios de UX

SideDockNest deve priorizar:

### Discrição

O dock deve ocupar o mínimo espaço possível quando não está em uso.

### Rapidez

Abrir apps deve exigir **apenas um clique**.

### Organização

Stacks permitem organizar apps por contexto.

### Não-intrusivo

O dock nunca deve roubar foco de outras janelas.

### Tolerante a erros

Ações destrutivas (deletar stack) devem solicitar confirmação. Paths inválidos devem ser sinalizados, não removidos automaticamente.

---

# Considerações Técnicas Importantes

## Janela Click-Through

No estado colapsado, a janela **NÃO** deve ser click-through — ela precisa detectar hover para expandir. Porém, a área de hover deve ser a mais fina possível (20px) para não atrapalhar o uso da tela.

## Interação com Fullscreen

Quando um aplicativo está em fullscreen, o dock deve ficar **atrás** (comportamento padrão de always-on-top com apps fullscreen exclusivos). Isso é o comportamento nativo do Windows e não requer tratamento especial.

## Performance

- O app deve ter **startup rápido** (< 1 segundo até estar interativo)
- Animações devem usar `transform` e `opacity` (GPU-accelerated)
- Usar `will-change` CSS apenas nas propriedades animadas
- Ícones base64 são carregados do store local (sem I/O em cada render)

## Segurança

- Nunca executar paths sem validação de existência
- Sanitizar inputs de nomes de stacks/itens
- CSP configurado adequadamente no Tauri config