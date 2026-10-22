# %knock design (v0.1)

## Goal

A ship states "my Nockchain address is X", in a form any other ship can fetch and check, with
two independent signatures:

1. **Urbit seal.** The ship signs the claim with its Urbit networking key (Jael, `cric`), so the
   claim can't be forged even if someone else relays it.
2. **Wallet proof.** The address's own Nockchain key (via Iris) signs a message naming the ship
   and the address, so a ship can't claim an address it doesn't control.

## Data

```hoon
+$  proof   [msg=@t pub=@t c=@t s=@t]          ::  iris nock_signMessage output
+$  claim   [who=ship addr=@t at=@da proof=(unit proof)]
+$  signed  [=claim =life seal=@ux]            ::  seal = (sign:as:cric (jam claim))
```

The agent keeps `mine=(unit signed)` and `seen=(map ship look)` (pending, none, found, fail).

## Flows

**Linking (local, web UI):**

1. Call `nock_connect` on `window.nockchain` to get the v1 address.
2. Build a message with lines `ship: ~x`, `address: X`, `issued: <iso time>`, `nonce: <128 random bits>`.
3. Call `nock_signMessage`. Iris shows the message and the user approves.
4. The browser checks the proof (see *Verification*) before sending it.
5. POST to `/apps/knock/api`. The agent checks:
   - the address is base58 of a plausible length;
   - the message contains `ship: <our>\n` and `address: <addr>\n`.
6. The agent seals the claim with the current Jael key and stores it.

**Lookup (ship to ship):**

1. Watch `[who %knock] /claim`. The remote agent gives one `%knock-update` fact and kicks.
2. Accept the claim only if `who.claim` is the ship we watched.
3. Check the seal against Jael's `%deed` for `[who life]`:
   - If the seal is bad, the lookup fails.
   - If the key is unknown, accept but mark `sealed=|`. The fact still came over Ames straight
     from `who`, so it's authentic.
4. Gall queues watches for agents a ship doesn't run instead of refusing them, so a 30s Behn
   timer fails the lookup and `%leave`s.

## Verification

Done in the viewing browser with `@nockbox/iris-wasm`, served from the desk:

1. The message contains `ship: <ship>\n` and `address: <addr>\n`.
2. `hashPublicKey(publicKeyToBeBytesVec(pub)) === addr`, so the key really is the address's key.
3. `verifySignature(bytes, {c, s}, msg)` holds. This is Schnorr over Cheetah, with the
   message hashed to Tip5.

The Hoon side doesn't run the Schnorr check yet. Nockchain's verifier is about 2–5k lines of
Hoon (`hoon/common/ztd/three.hoon` and its deps), and it would be slow without jets. Porting it
is the v0.2 goal, so ships can verify with no JavaScript.

## Web API

All routes require an Eyre session. Writes need an `x-knock` header: browsers can't send custom
headers cross-site without a CORS preflight, so this blocks cross-site form posts.

| Route | |
|---|---|
| `GET /apps/knock` | UI |
| `GET /apps/knock/state.json` | `{ship, mine, seen[]}` |
| `POST /apps/knock/api` | `{action: set\|clear\|lookup\|forget, ...}` → state |
| `GET /apps/knock/iris-wasm.{js,wasm}` | verifier |

## Known limits and next steps

- **On-ship verification** (v0.2): port the Cheetah/Tip5 verify to Hoon, then add a `proven`
  flag computed by the ship.
- **Key rotation:** after a breach or rekey, `mine` keeps the old seal and life. Re-seal on
  `%set`. A Jael subscription could re-seal automatically.
- **Directory:** a star could aggregate its planets' claims, so you could look up "everyone
  sponsored by ~sidnus".
- **Replay:** a proof is bound to the ship and address, but not to a time window. The `issued`
  line is informational.
- **Remote scry** would make lookups cheaper than watch-and-kick.
