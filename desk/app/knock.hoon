::  knock: who's there? link your urbit id to your nockchain address
::
::  you publish one claim, sealed with your ship's networking key. other
::  ships fetch it by watching /claim, which answers once and kicks. the
::  web ui at /apps/knock lets you link an address (proven with an iris
::  wallet signature) and look up anyone else's.
::
/-  *knock
/+  default-agent, dbug, server, knock
|%
+$  versioned-state  $%(state-0 state-1)
+$  state-1
  $:  %1
      mine=(unit signed)
      seen=(map ship look)
  ==
::  state-0: %found looks had no sealed flag
::
+$  state-0
  $:  %0
      mine=(unit signed)
      seen=(map ship look-0)
  ==
+$  look-0
  $%  [%pending since=@da]
      [%none at=@da]
      [%found at=@da =signed]
      [%fail at=@da why=@t]
  ==
+$  card  card:agent:gall
--
::
%-  agent:dbug
=|  state-1
=*  state  -
^-  agent:gall
=<
|_  =bowl:gall
+*  this  .
    def   ~(. (default-agent this %|) bowl)
    hc    ~(. +> bowl)
::
++  on-init
  ^-  (quip card _this)
  :_  this
  [%pass /eyre/connect %arvo %e %connect [~ /apps/knock] dap.bowl]~
::
++  on-save  !>(state)
++  on-load
  |=  =vase
  ^-  (quip card _this)
  =/  old  !<(versioned-state vase)
  ?-    -.old
      %1  `this(state old)
      %0
    =/  up
      |=  l=look-0
      ^-  look
      ?.(?=(%found -.l) l [%found at.l signed.l |])
    `this(state [%1 mine.old (~(run by seen.old) up)])
  ==
::
++  on-poke
  |=  [=mark =vase]
  ^-  (quip card _this)
  ?+    mark  (on-poke:def mark vase)
      %knock-action
    ?>  =(src our):bowl
    =^  cards  state  (act:hc !<(action vase))
    [cards this]
  ::
      %handle-http-request
    =^  cards  state  (handle-http:hc !<([@ta inbound-request:eyre] vase))
    [cards this]
  ==
::
++  on-watch
  |=  =path
  ^-  (quip card _this)
  ?+    path  (on-watch:def path)
      [%http-response *]  `this
  ::
      [%claim ~]
    :_  this
    :~  [%give %fact ~ %knock-update !>(`update`mine)]
        [%give %kick ~ ~]
    ==
  ==
::
++  on-agent
  |=  [=wire =sign:agent:gall]
  ^-  (quip card _this)
  ?+    wire  (on-agent:def wire sign)
      [%look @ ~]
    =^  cards  state  (heard:hc (slav %p i.t.wire) sign)
    [cards this]
  ==
::
++  on-arvo
  |=  [=wire =sign-arvo]
  ^-  (quip card _this)
  ?+    wire  (on-arvo:def wire sign-arvo)
      [%eyre %connect ~]  `this
  ::
      [%timeout @ @ ~]
    =/  who  (slav %p i.t.wire)
    =/  since  (slav %da i.t.t.wire)
    ::  only time out the lookup this timer was set for
    ?.  =([~ %pending since] (~(get by seen) who))  `this
    :_  this(seen (~(put by seen) who [%fail now.bowl 'no answer: offline, or no %knock there']))
    [%pass /look/(scot %p who) %agent [who %knock] %leave ~]~
  ==
::
++  on-peek
  |=  =path
  ^-  (unit (unit cage))
  ?+    path  (on-peek:def path)
      [%x %mine ~]
    ``knock-update+!>(`update`mine)
  ::
      [%x %claim @ ~]
    =/  who  (slav %p i.t.t.path)
    =/  l  (~(get by seen) who)
    ``knock-update+!>(`update`?.(?=([~ %found *] l) ~ `signed.u.l))
  ::
      [%x %state ~]
    ``json+!>(state-json:hc)
  ==
::
++  on-leave  on-leave:def
++  on-fail   on-fail:def
--
::
|_  =bowl:gall
::
++  act
  |=  =action
  ^-  (quip card _state)
  ?-    -.action
      %clear  `state(mine ~)
  ::
      %set
    ?>  (sane-addr:knock addr.action)
    ?>  ?~  proof.action  &
        (names:knock our.bowl addr.action u.proof.action)
    `state(mine `(seal [our.bowl addr.action now.bowl proof.action]))
  ::
      %forget
    :_  state(seen (~(del by seen) who.action))
    ?.  (~(has by wex.bowl) [/look/(scot %p who.action) who.action %knock])
      ~
    [%pass /look/(scot %p who.action) %agent [who.action %knock] %leave ~]~
  ::
      %lookup
    =*  who  who.action
    =/  =wire  /look/(scot %p who)
    :_  state(seen (~(put by seen) who [%pending now.bowl]))
    =/  watch=card  [%pass wire %agent [who %knock] %watch /claim]
    ::  gall holds requests for agents a ship doesn't run instead of
    ::  refusing them, so give up on our own after a while
    =/  timer=card
      [%pass /timeout/(scot %p who)/(scot %da now.bowl) %arvo %b %wait (add now.bowl ~s30)]
    ?.  (~(has by wex.bowl) [wire who %knock])
      ~[watch timer]
    ~[[%pass wire %agent [who %knock] %leave ~] watch timer]
  ==
::  +seal: sign a claim with our current networking key
::
++  seal
  |=  =claim
  ^-  signed
  =/  lyf=life
    .^(life %j /(scot %p our.bowl)/life/(scot %da now.bowl)/(scot %p our.bowl))
  =/  rng=ring
    .^(ring %j /(scot %p our.bowl)/vein/(scot %da now.bowl)/(scot %ud lyf))
  [claim lyf (sign:as:(nol:nu:cric:crypto rng) (jam claim))]
::  +pass-of: a ship's public key at a life, if jael knows it
::
++  pass-of
  |=  [who=ship lyf=life]
  ^-  (unit pass)
  =/  res
    %-  mole  |.
    .^  [life pass (unit @ux)]  %j
      /(scot %p our.bowl)/deed/(scot %da now.bowl)/(scot %p who)/(scot %ud lyf)
    ==
  ?~  res  ~
  `+<.u.res
::  +sealed: does the seal check out against the claimed ship's key?
::
::    ~ if we don't know the key yet; the claim still came to us
::    over ames straight from that ship, so it's authentic either way
::
++  sealed
  |=  s=signed
  ^-  (unit ?)
  =/  pas  (pass-of who.claim.s life.s)
  ?~  pas  ~
  =/  out  (mole |.((sure:as:(com:nu:cric:crypto u.pas) seal.s)))
  `?&(?=([~ ~ *] out) =(u.u.out (jam claim.s)))
::
++  heard
  |=  [who=ship =sign:agent:gall]
  ^-  (quip card _state)
  =/  put  |=(=look `state(seen (~(put by seen) who look)))
  ?+    -.sign  `state
      %watch-ack
    ?~  p.sign  `state
    (put [%fail now.bowl 'no %knock on that ship'])
  ::
      %kick
    ?.  ?=([~ %pending *] (~(get by seen) who))  `state
    (put [%fail now.bowl 'no answer'])
  ::
      %fact
    ?.  =(%knock-update p.cage.sign)  `state
    =/  upd  !<(update q.cage.sign)
    ?~  upd  (put [%none now.bowl])
    ?.  =(who who.claim.u.upd)
      (put [%fail now.bowl 'claim names a different ship'])
    =/  sel  (sealed u.upd)
    ?:  =([~ |] sel)
      (put [%fail now.bowl 'bad seal'])
    ?.  (sane-addr:knock addr.claim.u.upd)
      (put [%fail now.bowl 'malformed address'])
    (put [%found now.bowl u.upd =([~ &] sel)])
  ==
::
++  state-json
  ^-  json
  =,  enjs:format
  %-  pairs
  :~  ship+s+(scot %p our.bowl)
      mine+?~(mine ~ (en-signed:enjs:knock u.mine))
      :-  %seen
      :-  %a
      %+  turn  ~(tap by seen)
      |=([who=@p l=look] (en-look:enjs:knock who l))
  ==
::
::  web ui
::
++  handle-http
  |=  [eid=@ta req=inbound-request:eyre]
  ^-  (quip card _state)
  =/  give  |=(p=simple-payload:http (give-simple-payload:app:server eid p))
  ?.  authenticated.req
    [(give (login-redirect:gen:server request.req)) state]
  =/  rl  (parse-request-line:server url.request.req)
  =/  route  [method.request.req site.rl ext.rl]
  ?+    route  [(give not-found:gen:server) state]
      [%'GET' [%apps %knock %state ~] [~ %json]]
    [(give (json-response:gen:server state-json)) state]
  ::
      [%'GET' [%apps %knock %iris-wasm ~] [~ %js]]
    [(give (fresh 'text/javascript' (as-octs:mimes:html (file-t /app/knock/iris-wasm/js)))) state]
  ::
      [%'GET' [%apps %knock %iris-wasm ~] [~ %wasm]]
    =/  =octs  .^(octs %cx (weld here /app/knock/iris-wasm/wasm))
    [(give (fresh 'application/wasm' octs)) state]
  ::
      [%'POST' [%apps %knock %api ~] ~]
    ::  a custom header can't be sent cross-site without a cors
    ::  preflight, so this stops other pages from posting as you
    ?.  (lien header-list.request.req |=([k=@t v=@t] =(k 'x-knock')))
      [(give [[403 ~] `(as-octs:mimes:html 'missing x-knock header')]) state]
    =/  jon  (bind body.request.req |=(o=octs (de:json:html q.o)))
    ?.  ?=([~ ~ *] jon)
      [(give [[400 ~] ~]) state]
    =/  res  (mule |.((action:dejs:knock u.u.jon)))
    ?:  ?=(%| -.res)
      [(give [[400 ~] `(as-octs:mimes:html 'bad action')]) state]
    =/  run  (mule |.((act p.res)))
    ?:  ?=(%| -.run)
      [(give [[422 ~] `(as-octs:mimes:html 'rejected')]) state]
    =^  cards  state  p.run
    :_  state
    (weld cards (give (json-response:gen:server state-json)))
  ::
      [%'GET' [%apps %knock *] ~]
    [(give (fresh 'text/html' (as-octs:mimes:html (file-t /app/knock/index/html)))) state]
  ==
::
++  here  /(scot %p our.bowl)/[q.byk.bowl]/(scot %da now.bowl)
++  file-t
  |=  =path
  ^-  @t
  .^(@t %cx (weld here path))
::
++  fresh
  |=  [type=@t =octs]
  ^-  simple-payload:http
  [[200 ~[['content-type' type] ['cache-control' 'no-cache']]] `octs]
--
