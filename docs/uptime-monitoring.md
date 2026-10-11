# Production availability monitoring

`Monitor Production Availability` probes both the public page and `/api/health` every five minutes from a GitHub-hosted runner. Three consecutive failures create one `uptime-alert` issue and fail the workflow, producing the normal GitHub Actions notification. Recovery closes the issue automatically.

This monitor catches broad DNS, TLS, Cloudflare, deployment, and application failures. It cannot prove accessibility from a Spanish residential ISP. The LALIGA blocks happen before requests reach Cloudflare, so a Cloudflare-origin health check can remain healthy while affected Spanish users cannot connect.

For ISP-specific detection, run the same two checks from a machine connected to each Spanish network that matters. The public endpoint is:

```text
https://themimicdice.com/api/health
```

Expected response: HTTP `200` with JSON containing `"ok": true` and `"service": "mimic-dice"`.
