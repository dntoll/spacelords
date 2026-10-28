# Enhetliga spelvyer och bildprompter

Kraven är **Fullständigt implementerat**. Riktade kontroller är godkända.
Leveransen följer snabbpublicering för manuell mobiltest. Sluttest och merge
inväntar separat beställning.

| Krav                          | Status                     | Beteende                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gemensam-events-panel`       | Fullständigt implementerat | Samma nedre rad med Events och End turn i alla spelvyer, även Build selection och vid kartval. Initialt infälld. Utfällningsval och läsposition följer med mellan vyer. Utfälld panel reserverar utrymme och rullar internt vid högst 40 procent av skärmhöjden. Uppspelning öppnar panelen och återställer därefter föregående val.                                                                                                                           |
| `dragbara-koer`               | Fullständigt implementerat | Gemensamma rader med draghandtag, position, symbol, namn, status och befintliga detalj- och avbrytåtgärder. Production visar varje projekt separat. Mus och touch ger insättningsmarkering och rullning nära kanten. Endast släpp ändrar ordningen. Space lyfter, pilar flyttar, Enter/Space släpper och Escape avbryter. Hjälpmedel får positionsbesked. Låsta köer kan inte ändras och ogiltig forskningsordning avvisas med förklaring utan delvis ändring. |
| `omordningsbar-reparationsko` | Fullständigt implementerat | Shipyard använder samma draghandtag. Vrak kan prioriteras om; ett skepp repareras per år. Befintlig och vald ordning bevaras vid omladdning.                                                                                                                                                                                                                                                                                                                   |
| `bildpromptpaket`             | Fullständigt implementerat | 54 engelska prompter med svenskt index och kopierade stilreferenser: tre skepp, 20 byggnadsporträtt, 24 symboler, sex planeter och en kartstation. Varje prompt anger motiv, referenser, perspektiv, bakgrund, filnamn och användning. Skeppsbilderna har därefter genererats och kopplats in enligt `genererade-skeppssprites`; övriga bilder återstår.                                                                                                       |
| `skeppssprites-pa-kartan`     | Fullständigt implementerat | Star map, Fleets, Route och flottanimationer använder befintliga bilder för alla fem skeppstyper. Närbild visar högst en per förekommande typ, mellanzoom en representativ bild med antal och längst ut en färgad markör. Riktning och urvals- och fiendemarkeringar behålls.                                                                                                                                                                                  |
| `forskningskamerans-granser`  | Fullständigt implementerat | Minsta zoom anpassas till hela aktuella trädet och faktisk trädyta med 16 pixlars marginal. Maxzoom är 1,8. Innehåll som ryms centreras; övrig panorering begränsas så onödigt tomrum inte kan skapas. Samma regler för mus, touch, tangentbord, Fit, storleksändring och ändrat träd.                                                                                                                                                                         |
| `planetinformation-pa-kartan` | Fullständigt implementerat | Upptäckta planeter visar Type och Habitability, även obebodda. Egna planeter visar aktuell beboelighet och obebodda kända grundvärden. Okända rutor visar endast Unexplored och avslöjar ingen planets existens eller egenskaper.                                                                                                                                                                                                                              |

## Uttryckliga ersättningar

- `gemensam-events-panel` ersätter tillåtelsen att dölja Events vid kartval
  och skilda paneler i olika vyer. `handelser`, `utvikbara-events`,
  `rundkontroller-pa-fler-vyer`, `end-turn-vid-kartval` och
  `fokuserat-kartval` behåller sina namn med detta förtydligande.
- `dragbara-koer` ersätter pilarna i `kompakta-koknappar` och grupperingen i
  `kompakt-produktionsko`. Kompakt utseende och avbrytåtgärder behålls.
- `omordningsbar-reparationsko` ersätter tvingande FIFO-prioritering i
  `automatisk-vrakreparation`. Takt, kostnader och resurser behålls.
- `planetinformation-pa-kartan` förtydligar `fokuserat-kartval`: okända rutor
  får etiketten Unexplored, medan okända planeter fortfarande är helt dolda.
- `viewport-game-layout` behåller skärmfyllnad utan sidscroll. Den gemensamma
  raden reserverar nu utrymme, så kartan fyller hela återstående ytan mellan
  navigation och raden. Det ersätter testets tidigare fasta 80 procent av hela
  skärmen, vilket inte tog hänsyn till en separat nedre rad.

## Verifiering, 2026-10-27

- Regressionstester reproducerade dold Events-panel, för fri forskningskamera,
  utebliven planetuppdatering och Build selections spärrstatus före respektive
  rättning.
- 550 kravkopplade enhetstester passerade; snabbsviten tog 15,74 sekunder av
  högst 20. Riktade uppföljningar verifierade senare justeringar.
- Riktade webbläsartester i mobil Chromium, mobil WebKit och desktop Chromium
  skyddar delad Events-instans och läsposition, samtliga spelvyer, planetfakta,
  ködragning med mus, touch och tangentbord, avbrott, långa listors rullning,
  forskningsberoenden, reparationsordning efter omladdning, forskningens Fit och
  gränser efter rotation, händelseuppspelning samt blandade flottors bilder och
  träffytor i alla tre flottkartorna. Native pinch kontrollerades i mobil Chromium.
- Promptmanifest, index, 53 filer, unika filnamn och alla referenser granskades
  automatiskt. Åtta referensbilder är byteidentiska med befintliga tillgångar.
- Sparformat och lagringsnycklar är oförändrade. Reparationsordningen använder
  samma sparade array som tidigare. Ingen bildgenerering har utförts.

Testerna finns i queue-order, research-tree, salvage, fleet-map och turn-console
under tests/unit samt unified-interface, event-controls, event-playback,
research-tree, planet-pages, production-map och queue-controls under tests/browser.
Publiceringsrapporten sparas av deploy:quick i dist/deployments. Fullständig
plattformsmatris och merge har inte beställts.
