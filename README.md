# 🦅 SideDockNest

### *O ninho definitivo para sua produtividade no Windows.*

SideDockNest é um dock lateral minimalista, poderoso e elegante, projetado para manter sua área de trabalho limpa enquanto mantém seus aplicativos e arquivos a apenas um clique de distância. Construído com **Tauri**, **React** e **Rust**, ele oferece uma experiência nativa, leve e extremamente rápida.

---

## ✨ Funcionalidades Premium

### 📁 Smart Stacks (Pastas Inteligentes)
Organize seu fluxo de trabalho em grupos lógicos. Crie "Stacks" para Desenvolvimento, Design, Games ou Documentos. Expanda apenas o que você precisa, quando precisa.

### 🔍 Busca Instantânea
Não perca tempo procurando ícones. Pressione `Alt + Space`, comece a digitar e encontre qualquer item em milissegundos. A busca filtra stacks, nomes de arquivos e caminhos automaticamente.

### ⚡ Global Access (Alt + Space)
Invoque o seu ninho de qualquer lugar do sistema. O atalho global abre o dock e foca na busca instantaneamente para uma experiência 100% focada no teclado se você desejar.

### 📦 Importação do Menu Iniciar
Preencha seu dock em segundos! O assistente de importação escaneia seu Windows e permite que você adicione seus softwares favoritos via busca em tempo real.

### 🖱️ Drag & Drop Avançado
Arraste arquivos diretamente do Explorer para o dock para adicioná-los. Reordene Stacks ou mova itens entre pastas com arrastar e soltar suave e animado.

### 🖥️ Inteligência Multi-monitor
O SideDockNest entende seu setup. Ele detecta automaticamente o monitor ativo e se posiciona perfeitamente na borda da tela onde seu trabalho está acontecendo.

---

## 🎨 Design & Estética

- **Glassmorphism**: Interface moderna com efeito de desfoque e transparência que se adapta ao seu papel de parede.
- **Micro-animações**: Transições suaves que tornam a interação fluida e prazerosa.
- **Dark & Light Mode**: Sincronização inteligente com o tema do seu sistema ou escolha manual via bandeja.
- **Pixel Perfection**: Posicionamento preciso para garantir que o dock esteja sempre encostado na lateral, cobrindo 100% da altura da tela sem bordas sobrando.

---

## 🛠️ Tecnologias de Ponta

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Backend**: [Rust](https://www.rust-lang.org/) + [Tauri v2](https://tauri.app/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Padrão no Windows 10/11)

### Passo a Passo
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/sidedocknest.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run tauri dev
   ```

---

## 📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
*Feito com ❤️ para simplificar sua vida digital.*
