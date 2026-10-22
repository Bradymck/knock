::  knock: json helpers and claim checks
::
/-  *knock
|%
::  +sane-addr: base58 alphabet, plausible v1 pkh length
::
++  sane-addr
  |=  addr=@t
  ^-  ?
  =/  len  (met 3 addr)
  ?&  (gte len 40)
      (lte len 64)
      (levy (trip addr) |=(c=@t !=(~ (find ~[c] b58))))
  ==
::
++  b58
  ^-  tape
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
::  +names: does the proof message name this ship and address?
::
::    the browser does the real schnorr check; this just refuses
::    proofs that were obviously made for something else
::
++  names
  |=  [who=ship addr=@t =proof]
  ^-  ?
  =/  msg  (trip msg.proof)
  ?&  !=(~ (find "ship: {(scow %p who)}\0a" msg))
      !=(~ (find "address: {(trip addr)}\0a" msg))
  ==
::
++  dejs
  =,  dejs:format
  |%
  ++  action
    |=  jon=json
    ^-  ^action
    =/  act=@tas  ((ot ~[action+(su sym)]) jon)
    ?+  act  ~|(bad-action+act !!)
      %clear   [%clear ~]
      %lookup  [%lookup ((ot ~[ship+(se %p)]) jon)]
      %forget  [%forget ((ot ~[ship+(se %p)]) jon)]
    ::
        %set
      =/  pro  (ot ~[msg+so pub+so c+so s+so])
      =/  [addr=@t up=(unit proof)]
        ((ou ~[address+(un so) proof+(uf ~ (mu pro))]) jon)
      [%set addr up]
    ==
  --
::
++  enjs
  =,  enjs:format
  |%
  ++  en-proof
    |=  p=proof
    ^-  json
    (pairs ~[msg+s+msg.p pub+s+pub.p c+s+c.p s+s+s.p])
  ::
  ++  en-signed
    |=  sig=signed
    ^-  json
    =/  c=claim  claim.sig
    %-  pairs
    :~  ship+s+(scot %p who.c)
        address+s+addr.c
        at+(sect at.c)
        proof+?~(proof.c ~ (en-proof u.proof.c))
        life+(numb life.sig)
    ==
  ::
  ++  en-look
    |=  [who=@p l=look]                       ::  not =ship: enjs has a +ship arm
    ^-  json
    %-  pairs
    %+  weld
      ^-  (list [@t json])
      ~[ship+s+(scot %p who) status+s+-.l]
    ^-  (list [@t json])
    ?-  -.l
      %pending  ~[at+(sect since.l)]
      %none     ~[at+(sect at.l)]
      %fail     ~[at+(sect at.l) why+s+why.l]
      %found    ~[at+(sect at.l) claim+(en-signed signed.l) sealed+b+sealed.l]
    ==
  --
--
