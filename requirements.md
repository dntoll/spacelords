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
  spelets engelska namn och etiketter.
- **Första spelgrunden:** en fast stjärnkarta, begränsad sikt, kartnavigation och
  information om hemplaneten och framtida forskning.
- **Imperiets utveckling:** kolonier, befolkning, råvaror, byggande och forskning.
- **Order och omvärld:** rundor, kolonisation, flottor, civilisationer och senare
  multiplayer.

[Produktkraven](docs/product-requirements.md) anger status för varje aktivt krav:
**Ej implementerat**, **Delvis implementerat** eller **Fullständigt implementerat**.
De beskriver också vad som återstår. Denna iteration omfattar inte byggorder
eller simulering av rundor.

- **Utveckling och kvalitet:** enkel lokal utveckling, kontroller, testning och
  leveransflöde, MVC och p5-karta. Se [tekniska krav](docs/technical-requirements.md).
- **Driftsättning:** publicera under en egen sökväg utan att påverka den
  befintliga webbplatsen eller exponera hemligheter.
  Se [driftsättningsinstruktionen](docs/deployment.md).
- **Arkitektur och arbetssätt:** ansvarsfördelning, domänmodell, läsbara kravnamn
  och versionshantering. Se [tekniska krav](docs/technical-requirements.md) och
  [arbetsreglerna](AGENTS.md).

Detaljer hålls i `docs/` så att denna översikt förblir kort. Publicering beställs separat.
