# %knock

**Knock knock. Who's there? `~sampel-palnet`, and here's my Nockchain address.**

`%knock` is an Urbit app that links your Urbit ID to your Nockchain (NOCK) address, so other
ships can find out where to send you NOCK and check that the link is real.

- **You publish one link.** Your ship seals it with its own Urbit networking key.
- **You prove the address is yours.** The Iris wallet signs a message naming your ship and your
  address. Anyone can check that signature, and that the signing key hashes to the address.
- **Others knock on your ship** to fetch your link directly over Urbit, then check both
  signatures themselves.

It's a building block. Tips, game prizes, pool payouts and community rewards all need to know
which NOCK address belongs to which ship.

## Install

From a ship that publishes it (once published):

```
|install ~sidnus %knock
```

Then open **Knock** in Landscape (`/apps/knock`).

## Use

1. Install [Iris](https://chromewebstore.google.com/detail/iris-wallet/opodllkjacnodkojeedmgjbogbmfchlb)
   in the browser you use for your ship.
2. Open Knock and click **Link with Iris**. Approve the connection, then the signature.
3. To look someone up, type their ship under **Knock on a ship**.

From the dojo:

```
:knock &knock-action [%lookup ~sampel-palnet]
:knock &knock-action [%forget ~sampel-palnet]
:knock &knock-action [%clear ~]
```

## What the badges mean

| Badge | Meaning |
|---|---|
| ✓ proven | The wallet signature checks out in your browser: the message names this ship and address, the key hashes to the address, and the Schnorr signature is valid. |
| claimed | The ship published an address but no wallet proof. |
| ✗ … | A proof is present but fails one of the checks. Don't trust it. |
| ✓ sealed by ~ship's Urbit key | Your ship checked the Urbit seal against that ship's current key. |

## How it works

See [DESIGN.md](DESIGN.md).

## Development

```
bin/sync [ship]          # copy desk/ into ~ship's mounted %knock and |commit
bin/dojo '<cmd>' [ship]  # run a dojo command and print the result
```

The dev ship is the moon `~lonbep-fonrus-datsun-fadsun`. Create the desk there once with
`|new-desk %knock` and `|mount %knock`.

## Credits

Signature checks in the browser use [`@nockbox/iris-wasm`](https://www.npmjs.com/package/@nockbox/iris-wasm)
0.2.2 (MIT, © NockBox), vendored in `desk/app/knock/` with its license.

## License

MIT
