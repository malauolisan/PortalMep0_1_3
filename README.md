# Portal do Movimento Espírita Progressista (MEP)

Este repositório contém o código-fonte do portal agregador do **Movimento Espírita Progressista (MEP)**, com um painel de administração integrado e backend em Node.js (Express) com suporte a APIs de conteúdo e inteligência artificial.

O projeto foi totalmente otimizado para compilação unificada de alta performance, utilizando **React (Vite) + Tailwind CSS** no frontend e **TypeScript (Express) + esbuild** no backend, sendo perfeitamente compatível para hospedagem em servidores virtuais (VPS) ou hospedagem compartilhada Node.js da **Hostinger**.

---

## 🚀 Como Preparar e Enviar para o GitHub

Para enviar o projeto para o seu próprio repositório GitHub, siga estes passos em seu terminal local:

1. **Inicialize o Git no diretório do projeto** (caso não tenha inicializado):
   ```bash
   git init
   ```

2. **Adicione os arquivos ao controle de versão**:
   ```bash
   git add .
   ```
   *(Nota: O arquivo `.gitignore` já está pré-configurado para ignorar o diretório `node_modules/`, a pasta de build `dist/` e suas chaves secretas locais do arquivo `.env` para garantir a máxima segurança).*

3. **Crie o primeiro commit**:
   ```bash
   git commit -m "feat: preparação do projeto para produção e implantação na Hostinger"
   ```

4. **Crie um repositório no seu GitHub** (vazio, sem selecionar arquivos iniciais como README ou .gitignore).

5. **Associe o repositório local ao GitHub** (substitua pelo seu link do GitHub):
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   ```

6. **Envie os arquivos**:
   ```bash
   git push -u origin main
   ```

---

## 🛠️ Métodos de Implantação na Hostinger

A Hostinger oferece duas maneiras principais de hospedar uma aplicação de servidor Node.js: **Hospedagem Compartilhada (com suporte a Node.js via hPanel)** ou **VPS (Servidor Virtual Privado)**. Abaixo, explicamos os dois procedimentos detalhadamente.

---

### Opção A: Hospedagem Compartilhada Node.js (via hPanel) – Recomendado para instalações rápidas

O hPanel da Hostinger possui uma interface simplificada para rodar aplicações Node.js usando o servidor Phusion Passenger.

#### 1. Configuração do Aplicativo no Painel:
1. Acesse o hPanel da Hostinger e navegue até a seção **Node.js**.
2. Clique em **Criar Aplicação Node.js**.
3. Preencha as configurações conforme abaixo:
   - **Diretório de Instalação (App Root):** `mep-portal` (ou o nome do seu diretório)
   - **Versão do Node.js:** Escolha a versão **20.x** ou **22.x** (caso disponível, ou superior a 18).
   - **Arquivo de Inicialização (Startup File):** `dist/server.cjs` (esta é a chave! Nosso processo de build compila o backend TypeScript para este arquivo CommonJS otimizado).
   - **Domínio/Subdomínio:** Selecione o endereço que deseja usar para o portal.

#### 2. Envio dos Arquivos via Git ou Gerenciador:
- Você pode conectar o repositório do seu GitHub diretamente no painel de implantação da Hostinger ou fazer o upload dos arquivos (fazer upload do ZIP sem a pasta `node_modules`).

#### 3. Instalação e Compilação no Servidor:
1. Pelo terminal do hPanel (via SSH ou pelo console Node.js do próprio painel), na pasta raiz da aplicação, instale todas as dependências rodando:
   ```bash
   npm install
   ```
2. Realize a compilação de produção para gerar a pasta `dist/` e o arquivo do servidor:
   ```bash
   npm run build
   ```
3. O script de build irá disparar simultaneamente:
   - O compilador do Vite para otimizar os arquivos estáticos e de visualização do React.
   - O empacotador de altíssima velocidade `esbuild`, que pegará o arquivo de servidor `server.ts` escrito em TypeScript e o compilará num único arquivo autônomo `dist/server.cjs`.

#### 4. Variáveis de Ambiente no hPanel:
No painel do gerenciador Node.js do hPanel, declare as seguintes variáveis de ambiente essenciais (conforme listado no seu `.env.example`):
- `NODE_ENV=production`
- `PORT=3000` (ou a porta informada pela Hostinger)
- `GEMINI_API_KEY`=*(sua chave de API da inteligência artificial)*
- `YOUTUBE_CHANNEL_ID`=*(ID do seu canal do YouTube, ex: UChchw2cv66MeQZhzG7XKWaA. O projeto já vem pré-configurado com este ID real do MEP como valor padrão caso você não o defina!)*
- `INSTAGRAM_ACCESS_TOKEN`=*(seu token do Instagram Graph API, opcional)*

Se preferir, crie um arquivo `.env` na raiz do projeto na Hostinger contendo essas variáveis.

#### 5. Inicie a Aplicação:
- No painel da Hostinger, mude o status do aplicativo para **Ativo** (Iniciar/Start). A Hostinger passará a redirecionar o tráfego do seu domínio para sua aplicação Node.js.

---

### Opção B: Servidor VPS Hostinger (com PM2 e Nginx) – Recomendado para maior controle, estabilidade e tráfego

Se você optou por um plano VPS na Hostinger, você tem controle total do sistema operacional através do acesso SSH. Veja como implantar:

#### 1. Preparação do Servidor (Primeiro acesso):
Conecte-se por SSH e instale o Node.js, Git e o gerenciador de processos PM2:
```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js ativo (versão recomendada LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para rodar o app em segundo plano perpetuamente
sudo npm install -g pm2
```

#### 2. Clonagem do Repositório e Configuração:
Na VPS, navegue até o diretório onde deseja hospedar o site (ex: `/var/www/portal-mep`):
```bash
cd /var/www
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git portal-mep
cd portal-mep
```

Crie o arquivo contendo as variáveis de ambiente base:
```bash
cp .env.example .env
nano .env
```
*(Preencha os valores reais de suas chaves e configure `NODE_ENV=production`).*

Instale e compile a aplicação:
```bash
# Instala as dependências gerais
npm install

# Compila o frontend React + backend TypeScript
npm run build
```

#### 3. Inicialização Perpétua com o PM2:
Rode a sua aplicação em segundo plano para mantê-la sempre ativa, mesmo se o servidor for reiniciado:
```bash
pm2 start dist/server.cjs --name "portal-mep"

# Configurar o PM2 para reiniciar com o sistema de forma automática
pm2 startup
pm2 save
```

#### 4. Configuração do Servidor Web (Nginx como Proxy Reverso):
Instale o Nginx para receber tráfego das portas 80/443 e redirecioná-lo internamente para o Node.js (porta 3000):
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/portal-mep
```

Cole a seguinte configuração no arquivo (substitua `mep.org.br` pelo seu domínio real):
```nginx
server {
    listen 80;
    server_name mep.org.br www.mep.org.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/portal-mep /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

*(Lembre-se de instalar o Certificado SSL usando o `certbot` para habilitar a navegação via HTTPS criptografada).*

---

## 🔑 Configuração do Firebase para Produção

O projeto atualmente utiliza o Firebase Firestore e Auth para a gestão de conteúdos, controle de administradores e banco de dados.

O arquivo `firebase-applet-config.json` contém as credenciais de acesso ao Firebase. Caso a administração do MEP queira migrar do banco de dados de desenvolvimento do AI Studio para o **projeto Firebase definitivo do MEP**:

1. Crie uma conta/projeto no console oficial do Firebase ([https://console.firebase.google.com/](https://console.firebase.google.com/)).
2. Ative os serviços:
   - **Authentication** (Habilite o provedor de E-mail/Senha).
   - **Firestore Database**.
   - **Storage** (Para upload de arquivos e mídias do portal).
3. Na engrenagem de configurações do projeto, adicione uma nova aplicação Web e copie as credenciais geradas.
4. Substitua os dados de suas credenciais no arquivo `firebase-applet-config.json` na raiz da aplicação.
5. Faça o commit das modificações para o seu repositório GitHub.

---

## 🛠️ Comandos de Desenvolvimento Úteis

Caso precise efetuar alterações futuras no projeto:

* **Desenvolvimento Local:** `npm run dev` (Inicia o servidor de desenvolvimento rápido onde o Express e o Vite HMR trabalham juntos na porta 3000).
* **Compilação Completa de Produção:** `npm run build` (Prepara toda a estática compactada do React CSS e compila o servidor TypeScriptExpress para JavaScript otimizado em `dist/server.cjs`).
* **Formatador de Segurança e Código:** `npm run lint` (Verifica a consistência estendida de tipos estáticos do TypeScript).
