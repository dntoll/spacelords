# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.
Se [hela visionen](docs/game-vision.md).

## Kravkategorier

- **Kompakta köhandlingar:** `kompakta-koknappar` är **Fullständigt implementerat**.
  Research queue och Build queue använder små knappar med ↑, ↓ och × för
  omordning och borttagning, med förklarande hjälptexter.

- **Spelupplevelse och språk:** skärmfyllande vyer, stor hexkarta och engelska
  speltexter. Dokumentationen är svenska med spelets engelska namn och etiketter.
- **Sparade spel:** tre separata spel med senaste speldatum, utforskad karta och
  automatisk sparning. Äldre ekonomi-spel bevaras och deras separata köer slås
  ihop vid uppdatering. Den tidigare uttryckligen beställda engångsrensningen
  av äldre spel är inte ett generellt tillstånd att radera sparplatser.
- **Karta och flottor:** fast exempelvärld, begränsad sikt, navigation,
  utforskning, kolonisation, flottbyggare och fysisk rörelse på kartan.
  Skepp ansluter direkt på samma hex eller till tomma flottor. På avstånd följer
  en fysisk förstärkningsgrupp målflottan tills den når ikapp
  (`skepp-till-rorlig-flotta`). Även ruttflottor kan förstärkas; Fleets anger
  ruttens ändplaneter (`forstarka-ruttflotta`, `flottans-handelsrutt`).
- **Ekonomi och byggande:** ändliga fyndigheter av Iron, Water och Oil utvinns
  till lokala obegränsade lager. Material förbrukas en gång vid byggstart.
  Varje planet har en enda Build queue för byggnader, delar och skepp, med
  högst ett färdigt projekt per år (`gemensam-planetko`). Fabriker avgör vilka
  produkter planeten kan tillverka. Rocket engine factory och Weapons module
  factory tillverkar delarna till Fighter; saknade lokalt byggbara delar köas
  automatiskt före skeppet (`delfabriker`, `skeppsdelar`, `automatiska-delorder`).
  `byggnadsantal-lokalt-och-globalt` är **Fullständigt implementerat**: Build
  selection visar befintliga byggnader per typ på vald planet och totalt på
  spelarens planeter. Köade byggprojekt ingår inte.
- **Forskning:** `forsknings-tradnavigation` är **Fullständigt implementerat**:
  ett zoom- och panorerbart forskningsträd med beroendepilar och bibehållen kamera.
  Forskningskö med automatiska förkunskaper låser upp alla
  skeppsfabriker och Trade logistics. Grundutvinning och Research station finns
  från start.
- **Logistik:** Trade routes länkar två ägda planeter och bildar nätverk.
  En [handelsgraf](docs/trade-route-graph.md) med karttrogna planetpositioner,
  materialöversikter och flottboxar är **Fullständigt implementerad**. Zoom,
  panorering och tilldelning via länkar ersätter listvyn.
  Flera flottor per rutt fraktar material till aktiva köprojekt automatiskt.
  `synliga-handelsrutter` är **Fullständigt implementerat**: handelsrutternas
  linjer syns även genom markerade hexrutor.
  Last, omlastning, avstånd och flottposition påverkar leveranser.
  Piratrån och eskortskydd ingår ännu inte.
- **Beslut och händelser:** Decisions och Next decision samlar val och
  försörjningsproblem. Spelaren kan hoppa över beslut ett år eller tysta ett
  enskilt beslut tills det återaktiveras i Decisions. `tysta-beslut` är
  **Fullständigt implementerat** och sparas separat i varje spel. End turn varnar
  samlat och låter spelaren fortsätta ändå. Händelsekonsolen (`handelser`) är
  fullständigt implementerad och anpassar sin storlek efter skärmen: fler
  synliga rader på större skärmar och kompakt format på små eller låga skärmar.
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
Separata fabriksköer ersätts nu av en gemensam planetkö. Byggplatser,
kartstyrning och sparplatsgränssnitt behålls, liksom befintliga sparade order.

[Tekniska krav](docs/technical-requirements.md),
[domänmodell](docs/domain-model.puml),
[arbetsregler](AGENTS.md) och
[driftsättning](docs/deployment.md) hålls separat.
