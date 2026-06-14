# Kylkollen

Mobil webapp för att hålla koll på hushållets matvaror, bäst före-datum och
handlingslista.

## Lokal utveckling

```bash
npm install
npm run dev
```

Utan Redis fungerar appen fortsatt lokalt med `localStorage`.

## Gemensamt hushåll med Upstash Redis

Appen har ett Vercel API i `api/household.ts`. Redis-hemligheterna används bara
på serversidan och skickas aldrig till webbläsaren.

1. Skapa eller anslut en Upstash Redis-databas via Vercel Marketplace.
2. Kontrollera att följande miljövariabler finns i Vercel:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Vercels äldre namn stöds också:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

3. Driftsätt projektet på nytt.
4. Öppna hushållsknappen uppe till höger i Kylkollen.
5. Skapa ett hushåll eller anslut med en befintlig tioteckenskod.

Vid skapande flyttas telefonens nuvarande lokala lager till den gemensamma
ytan. Delningskoden fungerar som hushållets lösenord och ska bara delas med
personer som får ändra lagret.

För att köra både Vite-appen och Vercels API lokalt behövs Vercel CLI och
miljövariabler från `.env.example`.

## Kontroller

```bash
npm run lint
npm run build
```

`npm run build` typkontrollerar både React-appen och Vercels API-funktioner.
