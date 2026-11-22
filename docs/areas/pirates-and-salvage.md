# Space pirates

Space pirates finns kring stjärnorna och upptäcks inom sikt. De patrullerar
och strider på hexen där de möter spelaren. Detaljerna står i
[Space pirates](../space-pirates.md). Bärgning, vrakleveranser och orbitala
varv är borttagna med `single-fleet-rensning`; `Salvage ship` finns kvar som
skeppstyp.

## Krav

- **Space pirates:** `rymdpirater-per-stjarna`, `rymdpiraters-patrullering`,
  `flottstrid-per-hex` och `rymdpiraters-sparning` är **Fullständigt
  implementerat**. Nya spel har fientliga pirater runt andra stjärnor,
  patrullering och strid efter varje hexsteg.

- **Strid i samma hex:** `strid-i-samma-hex` (2026-11-22) är
  **Fullständigt implementerat**. Delar spelarens flotta och en pirat hex
  blir det strid. Står de i samma hex när rundan börjar strider de innan
  någon rör sig. Går spelarens flotta in i piratens hex stannar piraten kvar,
  så att den inte smiter. Det ersätter regeln i `flottstrid-per-hex` att
  flottor som byter hex med varandra i samma steg inte strider: går spelaren
  in i piratens hex blir det strid. En pirat markeras som sin hex, så ett
  andra tryck på den skickar flottan dit (`hexval-med-vag`).

- **Skeppsbilder:** `unik-bild-for-civila-transporter` och
  `egen-raptor-grafik` är **Fullständigt implementerat**. Civilian shuttle och
  Raptor har egna bilder. Se [skeppsgrafik](../ship-artwork.md).

## Borttaget med `single-fleet-rensning`

Följande krav gäller inte längre: `automatisk-varvsplacering`,
`bargat-piratskepp-behaller-typ`, `bargningsko`,
`varvets-automatiska-materialforsorjning` och `omordningsbar-reparationsko`.
