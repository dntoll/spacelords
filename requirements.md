# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.

Visionen är föränderlig. Vi bygger små, testade steg och skiljer beslutade
funktioner från framtida spelmekanik. Se [hela visionen](docs/game-vision.md).

## Kravkategorier

- **Spelupplevelse och språk:** skärmfyllande vyer utan scroll, stor karta och
  kortfattad spelinformation på engelska. Dokumentationen är på svenska med
  spelets engelska namn och etiketter. `viewport-game-layout` omfattar även
  smala skärmar med större systemtypsnitt.
- **Sparade spel:** `tre-sparplatser`, `sparat-spel`, `sparplats-utforskad-karta`
  och `tomm-sparplats` är fullständigt implementerade. Startsidan visar tre
  separata spel med senaste speldatum och utforskad karta. Automatisk sparning i
  webbläsaren ersätter återställning vid omladdning.
- **Första spelgrunden:** en fast stjärnkarta, begränsad sikt, kartnavigation och
  information om hemplaneten, byggande, flottor och rundor. Byggnader visar sin
  resursanvändning och beställs på bestämda byggplatser. Varje shipyard har en egen kö med fem platser och kan
  färdigställa ett skepp per år, parallellt med andra fabriker och byggplatser.
  Skeppsorder kan tilldelas en mottagande flotta. `kartflottor` visar varje
  flotta som en egen skeppssvärm med destinationspil från flottan och
  skeppens spetsar riktade mot destinationen. Flottor i samma hex ligger på en
  cirkel innanför hexen. `flottval-pa-kartan` och `dra-flottdestination` är
  fullständigt implementerade: flottor kan markeras separat, lysas upp och dras
  till en destination med förhandsvisad pil. `skeppsbilder` och
  `flottbyggar-minikarta` är fullständigt implementerade: markerade flottor visar
  skeppsbilder och Fleets har gemensamma skeppsrutor med dragöverföring samt en
  minikarta för vald flotta, i stället för enbart position och sifferkolumner.
  `tomma-flottor-utan-position` är **Fullständigt implementerat**: första skeppet
  sätter positionen, sista skeppet släpper den. Tomma flottor tar emot skepp
  från alla platser; fyllda flottor kräver samma hex.
- **Imperiets utveckling:** kolonier, befolkning, råvaror, byggande och forskning.
- **Order och omvärld:** rundor, kolonisation, flottor, civilisationer och senare
  multiplayer. `handelser` och `arsrundor-och-order` är **Fullständigt implementerade**
  med en liten kronologisk konsol ovanför `End turn`, ankomstbesked och
  automatisk planering utan `Turn summary` eller `Continue`.

[Produktkraven](docs/product-requirements.md) anger status för varje aktivt krav:
**Ej implementerat**, **Delvis implementerat** eller **Fullständigt implementerat**.
De beskriver också vad som återstår. Denna iteration omfattar byggplatser,
fabriksköer, flottor, utforskning, fungerande kolonisation och forskning som låser
upp de tre befintliga skeppsfabrikerna. Research station kan byggas från start.
`planetbyggplatser` och `fabrikskoer` ersätter `gemensam-byggko`.
`forska-fram-fabriker`, `kolonisation` och `kartorderstatus` är fullständigt
implementerade. Kartan visar tomma byggplatser och tomma fabriksköer.
`rakare-hexforflyttning` fördelar flottornas riktningsbyten jämnt mot målet.

- **Utveckling och kvalitet:** enkel lokal utveckling, kontroller, testning och
  leveransflöde, MVC och p5-karta. Se [tekniska krav](docs/technical-requirements.md).
- **Driftsättning:** publicera under en egen sökväg utan att påverka den
  befintliga webbplatsen eller exponera hemligheter.
  Se [driftsättningsinstruktionen](docs/deployment.md).
- **Arkitektur och arbetssätt:** ansvarsfördelning, domänmodell, läsbara kravnamn
  och versionshantering. Se [tekniska krav](docs/technical-requirements.md) och
  [arbetsreglerna](AGENTS.md).

Planetens `Overview` samlar nu byggplatser och fabriksköer. `fabrikskoer` är
**Fullständigt implementerat** med alltid synlig skeppsbeställning ovanför varje
kö: kostnad, destination och `Queue`-knapp ersätter fabrikens `Build`-meny.
Vyn har kompakta
handlingar och resursstaplar i `Annual budget`. `Build selection` är en egen
sökbar vy med kortrutnät, kostnadsindikatorer och gemensamma byggnadsbilder.
`gemensamma-byggnadsbilder` och `kompakta-bygghandlingar` är fullständigt
implementerade. De fyra tillhandahållna byggnadsbilderna visas i `Research`,
`Build selection` och på byggplatserna; platshållare används vid bildfel. `Construction`-fliken och den inbäddade byggmenyn ersätts.

Detaljer hålls i `docs/` så att denna översikt förblir kort. Publicering beställs separat.
