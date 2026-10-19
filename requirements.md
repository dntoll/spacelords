# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.
Se [hela visionen](docs/game-vision.md).

## Kravkategorier

- **Spelupplevelse och språk:** skärmfyllande vyer, stor hexkarta och engelska
  speltexter. Dokumentationen är svenska med spelets engelska namn och etiketter.
- **Sparade spel:** tre separata spel med senaste speldatum, utforskad karta och
  automatisk sparning. Ny ekonomi använder ett nytt sparformat. Äldre spel tas
  bort i just denna leverans efter uttryckligt användarbeslut; detta får inte
  antas vid framtida uppdateringar.
- **Karta och flottor:** fast exempelvärld, begränsad sikt, navigation,
  utforskning, kolonisation, flottbyggare och fysisk rörelse på kartan.
  Skepp ansluter direkt på samma hex eller till tomma flottor. På avstånd följer
  en fysisk förstärkningsgrupp målflottan tills den når ikapp
  (`skepp-till-rorlig-flotta`). Även ruttflottor kan förstärkas; Fleets anger
  ruttens ändplaneter (`forstarka-ruttflotta`, `flottans-handelsrutt`).
- **Ekonomi och byggande:** ändliga fyndigheter av Iron, Water och Oil utvinns
  till lokala obegränsade lager. Material förbrukas en gång vid byggstart.
  Planetens byggnadskö färdigställer högst en byggnad per år. Varje shipyard
  har dessutom en egen femplatskö och kan färdigställa ett skepp per år.
- **Forskning:** forskningskö med automatiska förkunskaper låser upp alla
  skeppsfabriker och Trade logistics. Grundutvinning och Research station finns
  från start.
- **Logistik:** Trade routes länkar två ägda planeter och bildar nätverk.
  Flera flottor per rutt fraktar material till aktiva köprojekt automatiskt.
  Last, omlastning, avstånd och flottposition påverkar leveranser.
  Piratrån och eskortskydd ingår ännu inte.
- **Beslut och händelser:** Decisions och Next decision samlar val och
  försörjningsproblem. Spelaren kan hoppa över beslut ett år. End turn varnar
  samlat och låter spelaren fortsätta ändå. Händelsekonsolen bevaras.
- **Utveckling och kvalitet:** MVC, TypeScript, ESLint, p5 i instance mode,
  en snabb testsvit inom 20 sekunder och en utökad svit i GitHub CI.
- **Driftsättning:** endast klientbygget under `spacelords/` i målrepot;
  befintlig webbplats, navigation, DNS och Pages-inställningar bevaras.

## Detaljer och status

[Produktkraven](docs/product-requirements.md) anger varje aktivt kravs status:
**Ej implementerat**, **Delvis implementerat** eller **Fullständigt implementerat**.
[Ekonomi och logistik](docs/economy-logistics.md) beskriver de nya spelreglerna.

Denna iteration ersätter `arsbudget` med `planetlager` och parallella
planetbyggen med `planetbyggnadsko`. Den inför utvinning, forskningskö,
transportfabrik, fysiskt handelsnätverk och beslutsstöd.
Befintliga fabriksköer, byggplatser, kartstyrning och sparplatsgränssnitt behålls.

[Tekniska krav](docs/technical-requirements.md),
[domänmodell](docs/domain-model.puml),
[arbetsregler](AGENTS.md) och
[driftsättning](docs/deployment.md) hålls separat.
