# AgroLink — Testar a beta no celular (APK + Wi-Fi local)

Objetivo: gerar um APK instalável no Android que conversa com a API rodando no seu PC, ambos na mesma rede Wi-Fi.

## 1. Descobrir o IP local do seu PC

- **Windows:** `ipconfig` → procure "Endereço IPv4" (ex: `192.168.2.21`)
- **macOS/Linux:** `ipconfig getifaddr en0` ou `hostname -I`

Anote esse IP. O celular precisa estar na **mesma rede Wi-Fi** que o PC.

## 2. Apontar o app para esse IP

No arquivo `eas.json`, no perfil `preview`, troque o IP de exemplo pelo seu:

```json
"env": { "EXPO_PUBLIC_API_URL": "http://SEU_IP_AQUI:3001/api/v1" }
```

## 3. Subir a API no PC

Na raiz do monorepo:

```bash
sudo service postgresql start          # garante o banco de pé
npm run build:db                       # compila o schema do Drizzle
node --import=tsx/esm apps/api/src/server.ts
```

A API já escuta em `0.0.0.0:3001`, então fica acessível pela rede.
Teste do próprio celular abrindo no navegador: `http://SEU_IP:3001/api/v1/health`

> Dica: libere a porta 3001 no firewall do PC se o celular não conectar.

## 4. Gerar o APK (EAS Build)

```bash
cd apps/mobile
npm i -g eas-cli        # uma vez só
eas login               # conta Expo (grátis)
eas build -p android --profile preview
```

Ao terminar (alguns minutos, build na nuvem da Expo), o terminal mostra um link
para baixar o `.apk`. Baixe no celular e instale (permita "fontes desconhecidas").

## 5. Testar

Abra o app AgroLink instalado. Login de teste (do seed):

- `joao@fazenda.com` / `senha123`
- `maria@agro.com` / `senha123`

Telas para validar: Feed, Vagas (publicar/candidatar), Loja/Marketplace
(publicar produto), AgroIA, Perfil, "Perto de mim" (geolocalização).

## Alternativa rápida (sem APK): Expo Go

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL="http://SEU_IP:3001/api/v1" npx expo start
```

Escaneie o QR code com o app **Expo Go** (Play Store / App Store). Abre na hora,
sem build — bom para iterar UI rápido.
