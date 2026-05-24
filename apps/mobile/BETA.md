# AgroLink — Instalar a beta no celular (Windows + APK + Wi-Fi local)

Guia para gerar um APK Android e instalar no seu celular, com a API rodando no
seu PC. **Celular e PC precisam estar na mesma rede Wi-Fi.**

> Use o **PowerShell** (ou Terminal do Windows). Abra uma janela para a API
> (que fica rodando) e outra para o build.

---

## Caminho rápido para testar HOJE: Expo Go (sem build)

Se você só quer ver o app no celular agora, sem esperar build:

1. Instale o app **Expo Go** (Play Store) no celular.
2. No PC, na pasta `apps\mobile`:
   ```powershell
   $env:EXPO_PUBLIC_API_URL="http://192.168.2.21:3001/api/v1"
   npx expo start
   ```
3. Escaneie o QR code com o Expo Go. Abre na hora.

Faça os passos **1 e 2 da seção abaixo (Postgres + API)** antes, senão o app
abre mas não carrega dados.

---

## Caminho do APK instalável (app de verdade, com ícone)

### 1. Subir o banco (PostgreSQL)

Se você instalou o Postgres no Windows, ele roda como serviço. No PowerShell
**como Administrador**:

```powershell
Get-Service postgresql*                 # ver o nome/status do serviço
Start-Service postgresql-x64-16          # ligar (ajuste a versão do nome)
```

O banco precisa existir com nome `agrolink`, usuário `postgres`, senha `postgres`
(é o que está em `apps\api\.env`). Para criar o banco, no pgAdmin ou via psql:

```powershell
psql -U postgres -c "CREATE DATABASE agrolink;"
```

### 2. Subir a API

Na **raiz do projeto** (ex: `C:\Users\SeuUsuario\Agrolink`):

```powershell
npm run build:db                              # compila o schema
node --import=tsx/esm apps/api/src/server.ts  # sobe a API (deixe rodando)
```

A API escuta em `0.0.0.0:3001`. **Teste do próprio celular** abrindo no
navegador: `http://192.168.2.21:3001/api/v1/health` — tem que responder.

> **Firewall:** se o celular não abrir o health, libere a porta 3001. No
> PowerShell como Admin:
> ```powershell
> New-NetFirewallRule -DisplayName "AgroLink API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
> ```

### 3. (Opcional) Popular dados de teste

Em outra janela, na raiz:

```powershell
node --import=tsx/esm apps/api/src/lib/seed.ts
```

Logins de teste: `joao@fazenda.com` / `senha123` · `maria@agro.com` / `senha123`

### 4. Gerar o APK na nuvem (EAS Build)

```powershell
cd apps\mobile
npm install -g eas-cli       # uma vez só
eas login                    # crie uma conta grátis em expo.dev se não tiver
eas build -p android --profile preview
```

Leva alguns minutos (build na nuvem da Expo). Ao terminar, o terminal mostra um
**link para baixar o `.apk`**.

### 5. Instalar no celular

1. Abra o link do APK no navegador do celular e baixe.
2. Toque no arquivo; o Android vai pedir para permitir "instalar de fontes
   desconhecidas" — permita.
3. Abra o AgroLink e faça login com um usuário de teste.

Telas para validar: Feed, Vagas (publicar/candidatar), Loja/Marketplace
(publicar produto), AgroIA, Perfil, "Perto de mim".

---

## Se o IP do seu PC mudar

O IP `192.168.2.21` está fixado em `eas.json` (perfil `preview`). Se mudar,
edite lá e gere o APK de novo. Descubra o IP atual com `ipconfig` (campo
"Endereço IPv4").

## Notas técnicas

- O APK aceita HTTP "puro" na rede local porque habilitamos
  `usesCleartextTraffic` via `expo-build-properties` (Android bloqueia isso por
  padrão em release).
- A URL da API vem de `EXPO_PUBLIC_API_URL` (definida no `eas.json`).
- AgroIA precisa de uma `ANTHROPIC_API_KEY` real em `apps\api\.env`; o resto do
  app funciona sem ela.
