# Research

`Research` visar ett zoom- och panorerbart forskningsträd, en kö med flikar
och detaljer för vald teknik. Forskning kräver en färdig Research station,
och en teknik tar 1–3 rundor. Förkunskaper köas automatiskt.

## Krav

- **Tydlig forskningsstatus:** `forskningsstatus-med-tydliga-farger` är
  **Fullständigt implementerat**. Research skiljer blå tillgänglig forskning
  från grön färdig forskning med ✓. Pågående är gul, köad lila och låst grå.
  Valmarkeringen bevarar statusfärgen. Se [renare spelgränssnitt](../compact-interface.md).

- **Forskning:** `forsknings-tradnavigation` är **Fullständigt implementerat**:
  ett zoom- och panorerbart forskningsträd med beroendelinjer och bibehållen kamera.
  `forskningstrad-utan-pilspetsar` (2026-11-20) är **Fullständigt
  implementerat**: linjerna saknar pilspetsar.
  `forskning-kraver-station` är **Fullständigt implementerat**: en färdig
  Research station krävs för nya forskningsbeställningar. Befintliga köer väntar
  utan drift; Decisions föreslår forskning först när en station finns. Detta
  ersätter tidigare fri köläggning under `forskningsko`.
  `forskningstradets-utrymme` är **Fullständigt implementerat**: trädet fyller
  vyn under rubriken, antal stationer visas bredvid rubriken även med bredare
  systemtypsnitt på smala telefoner och Research queue
  öppnas vid behov. Zoomrutan är borttagen; pinch och mushjul finns kvar.
  Forskningskö med automatiska förkunskaper låser upp alla
  skeppsfabriker och Trade logistics. Grundutvinning och Research station finns
  från start.
