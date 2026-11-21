# Start, sparade spel och navigering

Spelet startar på `Saved games` med tre sparplatser och testlägena för
strid och bordning. Härifrån väljs helskärm. Huvudmenyn leder till
`Star map`, `Fleets`, `Factories`, `Production`, `Research` och `Decisions`.
Skärmarna har inga extra knappar tillbaka till sådant som menyn redan når.
Spelet sparas automatiskt. Bara det nuvarande sparformatet laddas
(`sparformat`); äldre sparade spel avvisas med ett meddelande i stället för
att översättas.

## Krav

- **Navigering:** `inga-overflodiga-navigeringsknappar` (2026-11-20) är
  **Fullständigt implementerat**. Skärmar har inga knappar tillbaka till kartan
  eller till skärmar som huvudmenyn redan når: `Back to map` på Research och
  planetsidan, `Open research` i Production, `Open in Production` i den gamla
  ruttpanelen och `Build a Research station` på Research är borttagna. Det
  ersätter knappen i `forskningsvy-utan-station`; förklaringen finns kvar.
  Bakåtknappar inom en skärm, som `Back` i Factories, behålls.

- **Startskärm och helskärm:** `startskarm-utan-scroll`, `separata-testlagen`
  och `helskarm-fran-sparade-spel` är **Fullständigt implementerade**. Tre
  sparplatser delar skärmens tillgängliga yta och testlägena finns under en
  egen rubrik. Helskärm väljs bara med knappen på `Saved games`; spelet
  fortsätter i helskärm på alla andra skärmar utan egen knapp.
  `helskarm-fran-sparade-spel` (2026-11-20) ersätter knappen i spelet från
  `helskarm-i-hela-spelet` och reservknappen i `fullscreen-i-bordning`.

- **Renare spelgränssnitt:** Kraven för borttagna S/Q-texter och hex-koordinater,
  korta instruktioner, färre upprepningar i Production, mindre New fleet-ruta,
  villkorad ! Needs attention vid titeln och kompakt forskningsvy är
  **Fullständigt implementerat**. Colony ship factory följer direkt efter
  Rocket engine factory. Se [krav och ersatta beteenden](../compact-interface.md).
  `handelsemarkering-utan-numrering` är **Fullständigt implementerat**:
  etiketter som Event 1 tas bort från kartans händelsemarkering.
  `research-med-ett-tryck` är **Fullständigt implementerat**: Research-knappen
  köar med ett tryck även direkt efter panorering av trädet.
  `forskningsdetaljer-vid-val` och `forskningstradets-utrymme` är
  **Fullständigt implementerat** med samtidig visning av träd och en mindre,
  fast detaljdel. På stående mobil ligger detaljerna under trädet; på bredare
  skärmar bredvid. Detta ersätter informationen i varje trädruta.
  `kompakt-forskningstrad` har halverad nodhöjd och cirka en tredjedel smalare
  noder med tätare grenar. Namnen i trädet utelämnar factory och ryms på två
  rader. Färg och små markörer ersätter statusraden.
  Detaljdelen använder en liten Research-knapp bredvid tekniknamnet och
  samlar beskrivning, kostnad och förkrav direkt under utan tom handlingsyta.
  `transport-ship-efter-rocket-engine` är **Fullständigt implementerat**:
  Transport ship factory har samma förkunskap som Colony ship factory,
  Rocket engine factory. Exploration ship factory krävs inte.

- **Spelupplevelse och språk:** skärmfyllande vyer, stor hexkarta och engelska
  speltexter. Dokumentationen är svenska med spelets engelska namn och etiketter.
  `planetoppning-i-kartrubrik` är **Fullständigt implementerat**: kompakt
  Open planet visas bredvid planetnamn och hexkoordinat överst i kartpanelen.

- **Sparade spel:** tre separata spel med senaste speldatum, utforskad karta
  och automatisk sparning. `sparformat` (2026-11-21) är **Fullständigt
  implementerat**: bara nuvarande sparformat (version 17) laddas, och äldre
  sparade spel avvisas. Det ersätter övergångarna från äldre format, efter
  uttryckligt beslut enligt `avstamning-sparkompatibilitet`.

- **Grundkrav:** `flera-skarmstorlekar` är **Fullständigt implementerat**:
  spelet går att använda på mobil, surfplatta och dator.
