# Cloud campaign collaboration

## User model

- Campaign owner opens collaboration and receives a revocable invite URL.
- Open campaigns also appear in **Tu cuenta > Campañas abiertas**. Joining there creates a persistent request that the host accepts or denies from the main app.
- The requester sees a centered status dialog; approval adds editor membership and loads the campaign automatically.
- Legacy invite URLs still join directly while the lobby flow is rolled out.
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

Five-second campaign polling remains fallback when WebSocket is unavailable. Join requests use the live room when the host has that campaign loaded plus a three-second persistent-request poll, so offline hosts still receive them after returning.

## Combat command synchronization

Combat tracker and map editor changes no longer wait for a whole campaign upload. The browser sends a `combat-section` command over the campaign WebSocket. `SharedCampaignRoom` assigns a monotonic sequence and broadcasts it to every editor, including the sender, so simultaneous clients converge on the same ordered result.

Full campaign uploads remain durability checkpoints, delayed to 12 seconds for combat-only changes and backed by the existing periodic autosave. Other campaign domains still use the full payload path.

## Lost-edit protection

Edits may happen while cloud request is in flight. If conflict merge finishes after a newer local edit, merged response must not be reapplied to workspace. Saved payload still becomes next merge base, then newer edit autosaves normally.

## Next scaling step

Current persistence still serializes full campaign payload. WebSocket removes polling delay and prevents stale response overwrite, but very large campaigns still pay full upload/write cost.

Combat tracker and map now use live section commands. The next persistence phase should store those commands or independently versioned snapshots in D1, then extend the model to:

- characters
- encounters
- diary
- tables
- compendium custom content
- UI/local preferences (never shared)

Each command would update one entity/domain with server-assigned sequence number. Durable Object would broadcast command immediately and compact command log into D1 snapshots periodically. This avoids whole-file writes and reduces conflicts from campaign-wide revision to entity-level revision.
