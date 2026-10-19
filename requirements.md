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
- **Första spelgrunden:** en fast stjärnkarta, begränsad sikt, kartnavigation och
  information om hemplaneten, byggande, flottor och rundor. Byggnader visar sin
  resursanvändning och beställs på bestämda byggplatser. Varje shipyard har en egen kö med fem platser och kan
  färdigställa ett skepp per år, parallellt med andra fabriker och byggplatser.
  Skeppsorder kan tilldelas en mottagande flotta. `kartflottor` visar varje
  flotta som en egen skeppssvärm med destinationspil från flottan och
  skeppens spetsar riktade mot destinationen.
- **Imperiets utveckling:** kolonier, befolkning, råvaror, byggande och forskning.
- **Order och omvärld:** rundor, kolonisation, flottor, civilisationer och senare
  multiplayer.

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

Planetens `Overview` samlar nu byggplatser och fabriksköer, med kompakta
handlingar och resursstaplar i `Annual budget`. `Build selection` är en egen
sökbar vy med kortrutnät, kostnadsindikatorer och gemensamma byggnadsbilder.
`gemensamma-byggnadsbilder` och `kompakta-bygghandlingar` är fullständigt
implementerade; slutbilder tillhandahålls av användaren och platshållare visas
tills dess. `Construction`-fliken och den inbäddade byggmenyn ersätts.

Detaljer hålls i `docs/` så att denna översikt förblir kort. Publicering beställs separat.
