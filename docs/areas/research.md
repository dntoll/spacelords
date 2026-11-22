# Research

`Research` visar ett zoom- och panorerbart forskningsträd, en kö med flikar
och detaljer för vald teknik. Trädet innehåller bara skeppstekniker:
`Missiles`, `Armor`, `Armored Transport` och `Armored Fighter`. Förkunskaper
köas automatiskt och en teknik tar 1–3 rundor. Forskningen går inte framåt
förrän forskningskapaciteten i [Single fleet](../single-fleet.md) är beslutad
(`flottforskning-av-tekniker`, **Ej implementerat**); Research säger
`Research does not advance yet.`

## Krav

- **Tydlig forskningsstatus:** `forskningsstatus-med-tydliga-farger` är
  **Fullständigt implementerat**. Tillgänglig forskning är blå, färdig grön med
  ✓, pågående gul, köad lila och låst grå. Se
  [renare spelgränssnitt](../compact-interface.md).

- **Trädnavigation:** `forsknings-tradnavigation`,
  `forskningstrad-utan-pilspetsar`, `forskningstradets-utrymme` och
  `forskningskamerans-granser` är **Fullständigt implementerat**. Trädet har
  beroendelinjer utan pilspetsar, fyller vyn och behåller kameran inom trädet.

- **Trädets utseende:** `forskning-utan-rubrikrad`,
  `forskningstrad-utan-korsningar`, `forskningstrad-raka-linjer`,
  `storre-forskningstext`, `storre-text-dar-det-far-plats`,
  `detaljer-utan-scroll`, `forskningsflikar`, `forskningsikon-i-detaljer` och
  `symbolbaserade-kataloger` är **Fullständigt implementerat**. Varje teknik
  har en dekorativ symbol och sitt namn.

- **Kö och tid:** `forskningstid`, `kompakta-koknappar` och `dragbara-koer`
  är **Fullständigt implementerat** för kön. En teknik tar 1–3 rundor efter
  djup i trädet. Kön ordnas med draghandtag och poster tas bort med ×.

- **Avslöjande:** `kompakt-forskningstrad`, `forskningens-avslojande`,
  `forskningsdetaljer-vid-val` och `dubbelklick-koar-forskning` är
  **Fullständigt implementerat**. Okända tekniker visar bara `?` tills
  förkunskaperna är klara eller tekniken är köad.

## Borttaget med `single-fleet-rensning`

Research station, fabriks-, Dome-, terraformings-, handels-, order- och
bärgningsteknikerna finns inte längre. Följande krav gäller därför inte:
`forskning-kraver-station`, `forsta-station-pa-vag`,
`forskningsvy-utan-station`, `bygga-forskningsstation`,
`planettypsforskning`, `colony-ship-efter-rocket-engine` och
`raptor-efter-dockningsteknik`.
