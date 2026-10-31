# Kartans prestanda

## Krav och status

- `responsiv-stjarnkarta` — **Fullständigt implementerat**. Panorering,
  nypzoomning, mushjul och tangentbordsnavigation ska reagera direkt även i
  den stora galaxen. Oförändrade speldata och övriga kontroller återanvänds
  under hela gesten, även första fingertrycket, andra fingret vid nypzoomning
  och släpp efter panorering eller nypzoomning. Flera inkommande uppdateringar ger högst en begärd
  omritning per bildruta.
- `rumsligt-kartindex` — **Fullständigt implementerat**. Kartvyn ska hitta
  innehållet i kamerans utsnitt utan att gå igenom hela världen vid varje
  omritning. Upptäckter, kartminne, terräng, stjärnor och urval behålls.
  Vid utzoomning hoppas okända tomma hexar över redan i urvalet.

## Orsak och lösning

Utgångsrevision `1c85dd80c7be2b828b0f8526e55432182004d10e` har
30 301 hexar i en ny galax. GalaxyMapView omvandlade varje hex till
världskoordinater vid varje omritning, även när nästan hela världen låg
utanför skärmen. AppController begärde dessutom flera fullständiga
AppReadModel för varje pekarhändelse och skickade kamerarörelser genom
hela AppView, inklusive Events och beslutsvägledning.

Uppföljning 2026-10-31: kamerans rörelsesteg använde den snabba vägen,
men första fingertrycket hämtade fortfarande fem fullständiga
spelögonblicksbilder. Ett andra finger samt avslutade gester gick också
genom den fullständiga uppdateringen. Dessutom beräknade träffkontrollen
för ruttstart alla koloniers ekonomiska ögonblicksbilder.
Nu registreras tryck i kartbakgrunden direkt, nypzoomning avbryter
eventuell orderdragning med enbart ändrat presentationstillstånd och
släpp efter kameragester bygger inte om gränssnittet. Ruttstart kontrollerar
bara planeten vid den valda hexen. Vanliga tryck väljer fortsatt objekt
och orderdragning behåller sina regler.

MapViewport indexerar en oföränderlig kartögonblicksbild i sorterade
hexrader. Binärsökning i höjdled och därefter i varje berörd rad ger
endast hexarna i utsnittet med befintlig marginal. Ett separat glest
urval används under den befintliga gränsen för okända hexlinjer. Ett
nytt index byggs när kartögonblicksbildens identitet ändras, exempelvis
vid upptäckt under rörelse. Kamerarörelse återanvänder indexet.

Ett quadtree behövs inte för detta regelbundna rutnät. Varken galaxens
storlek, system eller sparformat ändras. Indexet är presentationsdata
och inför inget nytt begrepp i problemdomänens klassdiagram.

AppController behåller senast presenterade läsmodell. Ren navigation
hämtar bara ändrat presentationstillstånd från AppModel och använder
AppView.renderCamera. Byggvalens ring följer kameran. Speländringar,
orderdragning, överlappande ruttval, besked och årsuppspelning använder
fortsatt fullständig uppdatering. Oförändrad hover går inte genom
spelögonblicksbild eller DOM. GalaxyMapView samlar omritningsbegäranden
med requestAnimationFrame och avbryter väntande omritning vid dispose.

## Mätning och verifiering

Lokal diagnostik den 2026-10-31, Node.js 24.7.0, 30 301 hexar och ett
utsnitt på 390 × 660 vid zoom 1:

| Arbete                                              |          Före |                               Efter |
| --------------------------------------------------- | ------------: | ----------------------------------: |
| Controller per panoreringssteg, utan rendering      | cirka 13,5 ms |                       cirka 0,17 ms |
| Urval till kartutsnitt                              | cirka 2,65 ms |                      cirka 0,008 ms |
| Hexar som behöver undersökas/projiceras per utsnitt |        30 301 | 161 returneras; ingen ny projektion |

Detta är delmätningar på utvecklingsdatorn, inte FPS eller mätningar på
spelarens telefon. Controllerjämförelsen använder samma uppvärmning,
100 panoreringssteg och en tom vy. Urvalsjämförelsen kör den ursprungliga
filtreringen och indexet i samma process. Reproducerbar diagnostik för
nuvarande kod, med 200 steg, finns i:

```sh
node --import tsx scripts/benchmark-map.mjs
```

Efter uppföljningen tar en hel panoreringsgest med tryck, rörelse och
släpp cirka 0,70 ms i controllern utan rendering på utvecklingsdatorn.
Detta är inte en mätning av gestlatens eller FPS på spelarens telefon.

Regressionstester reproducerade fullständig gränssnittsuppdatering vid
dragning, 30 301 projektioner per utsnitt och omedelbar omritning av varje
inkommande uppdatering före rättning. Automatiska tester skyddar även
nypzoomning, kameraankare, oförändrad hover, avbruten rendering, kartkanter,
utzoomning, utbytt kartminne och lagerordning. Mobiltestet kontrollerar
att upprepade kameraändringar inte bygger om Turn console och att
slutlig position och zoom når canvas. Även ett verkligt pekartryck,
dragning och släpp kontrolleras från början till slut utan ändringar
i Turn console. Tidsmätningar används inte som
instabila godkännandegränser i CI.
