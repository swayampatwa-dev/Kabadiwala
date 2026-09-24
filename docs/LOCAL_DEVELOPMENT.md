# Local Development

## Safety

This reconstruction is local only. Do not run deployment or git-push commands.

## Requirements and commands

```bash
npm install
npm run seed
npm run dev
```

Web: `http://localhost:5173`  
API health: `http://localhost:4000/api/health`

Quality gates:

```bash
npm run typecheck
npm test
npm run build
```

## Prototype authentication

Demo OTPs are local fixtures and must be visibly labelled as prototype-only.
Accounts and credentials are documented in the current README after the
reconstruction. No real SMS or payment is sent.

## Reset

`npm run seed` resets deterministic demo data. Never represent reset data as
field research or live authorized-recycler registry data.

