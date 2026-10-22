::  knock: link an urbit id to a nockchain address
::
::  a ship publishes a +claim ("my nock address is X"), sealed with its
::  own networking key. an optional +proof carries a nockchain schnorr
::  signature (made by the iris wallet) over a message naming the ship
::  and the address, so anyone can check the ship really controls it.
::
|%
::  +proof: iris nock_signMessage output, verbatim
::
::    msg  the exact text that was signed
::    pub  signer's cheetah public key (base58, as iris returns it)
::    c/s  schnorr challenge and scalar, little-endian hex
::
+$  proof  [msg=@t pub=@t c=@t s=@t]
::
+$  claim
  $:  who=ship
      addr=@t                  ::  base58 v1 pkh
      at=@da
      proof=(unit proof)
  ==
::  +signed: claim plus the ship's seal over (jam claim)
::
+$  signed  [=claim =life seal=@ux]
::
::  +look: what we learned knocking on a ship
::
::    sealed in %found: & if we checked the seal against the ship's
::    current key, | if jael didn't know the key yet (the claim still
::    came over ames straight from that ship)
::
+$  look
  $%  [%pending since=@da]
      [%none at=@da]           ::  ship has %knock but no claim
      [%found at=@da =signed sealed=?]
      [%fail at=@da why=@t]
  ==
::
+$  action
  $%  [%set addr=@t proof=(unit proof)]
      [%clear ~]
      [%lookup who=ship]
      [%forget who=ship]
  ==
::  +update: what /claim gives a peer, once, then kicks
::
+$  update  (unit signed)
--
