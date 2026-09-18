# Running your own collaboration relay

Workspace sharing (Remote and the PWA) connects host and guests through a relay:
an opaque WebSocket that forwards end-to-end encrypted envelopes. It cannot
decrypt, read, or persist workspace content, but every shared session passes
through whichever relay the app is pointed at.

Deep Space still defaults to the upstream public relay,
`wss://relay.deepspace.app/v1/connect`. Deploy your own before you ship sharing
to users.

## Deploy

The server lives in `packages/deepspace-relay/` and ships with a Dockerfile and
a production compose file.

```bash
cd packages/deepspace-relay
docker compose -f docker-compose.prod.yml up -d
```

Put it behind TLS — the client connects over `wss://`, so the relay needs a
certificate and a hostname. Check `GET /health` and `GET /ready` once it is up.

## Point the app at it

Set `PUBLIC_RELAY_URL` in the environment the app server runs with:

```bash
PUBLIC_RELAY_URL=wss://relay.example.com/v1/connect
```

`src/lib/modules/collaboration/relay.ts` reads it and falls back to the upstream
default when it is unset. Both the sharing dialog and the Remote page use that
single constant, so there is nothing else to change.

For the invite links the host generates, `DEEPSPACE_REMOTE_URL` controls the web
address guests open (default `https://remote.deepspace.app`). Set it to your own
deployment of the Remote page if you host one.

## Origin allowlist

The relay accepts the installed app's dynamic local origin plus the web origins
you configure, and rejects everything else. Review that list on your deployment
before opening it to guests.
