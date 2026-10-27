# Cloud campaign collaboration

## User model

- Campaign owner opens collaboration and receives a revocable invite URL.
- Authenticated users joining that URL become campaign editors.
- Owner can close collaboration at any time. Invite is revoked, editor memberships are removed, and connected editors keep their current state as a local copy.
- Editors can leave without deleting owner campaign.
- Public catalog visibility stays separate from collaboration. Public means copyable; collaboration means editable.

## Live synchronization

`SharedCampaignRoom` is a Durable Object keyed by campaign ID. It does not own campaign payload. D1 remains authoritative.

1. Browser autosaves campaign with optimistic `baseRevision`.
2. D1 commit increments revision.
3. Pages Function publishes committed revision to Durable Object.
4. Durable Object broadcasts revision to connected browsers over WebSocket.
5. Clean browsers fetch and apply new payload immediately.
6. Dirty browsers save first, then use existing three-way merge on revision conflict.

Five-second polling remains fallback when WebSocket is unavailable. Previous one-second status polling is no longer primary path.

## Lost-edit protection

Edits may happen while cloud request is in flight. If conflict merge finishes after a newer local edit, merged response must not be reapplied to workspace. Saved payload still becomes next merge base, then newer edit autosaves normally.

## Next scaling step

Current persistence still serializes full campaign payload. WebSocket removes polling delay and prevents stale response overwrite, but very large campaigns still pay full upload/write cost.

If profiling shows payload size dominates latency, migrate persistence to independently versioned domains:

- combat tracker and map
- characters
- encounters
- diary
- tables
- compendium custom content
- UI/local preferences (never shared)

Each command would update one entity/domain with server-assigned sequence number. Durable Object would broadcast command immediately and compact command log into D1 snapshots periodically. This avoids whole-file writes and reduces conflicts from campaign-wide revision to entity-level revision.
