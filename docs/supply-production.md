# Försörjningsregler

Route och Production ersätter den tidigare Supply & production-vyn enligt
[kartkraven](route-production.md). Försörjningsbedömning och transportregler
behålls. Första projektet i planetens Build queue styr sammanfattad status;
Production kan visa den valda köpostens verkliga försörjningskedja.

| Kravnamn             | Status                     | Produktkrav                                                                                                                                                                                                                                        |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forsorjningsstatus` | Fullständigt implementerat | Skilj olösta behov från ordnade leveranser och tillräcklig lokal utvinning. Reservationer, ändliga fyndigheter, saknade fabriker och personal påverkar bedömningen. Decisions och kartmarkeringar använder samma underlag.                         |
| `leveransfloden`     | Fullständigt implementerat | Visa verkliga leveranser och beställd delproduktion som steg i projektets försörjning, med status, källa, mottagare, aktuell transportplats, hinder och ankomstuppskattning när underlag finns. Production markerar berörda planeter och farleder. |
| `produktionsformaga` | Fullständigt implementerat | Production erbjuder produkter från färdigbyggda fabriker och förklarar hinder. Möjlig tillverkning räknas inte som ordnad försörjning. Planeten har fortsatt en enda Build queue.                                                                  |

## Ersatta Supply-gränssnittskrav

2026-10-24: `forsorjningsoversikt` ersätts av `route-kartvy` och
`forsorjningsproblem-pa-kartan`. `relevanta-material` och `materialoversikt`
ersätts av projektval, byggdetaljer och `byggprojektets-forsorjningskedja`.
Den sorterade planetlistan, expanderbart globalt lager, materialsökning och
detaljerad global materialöversikt tas bort. `produktionsformaga` och
`leveransfloden` behåller sina namn men får presentation i de nya kartvyerna.
Planetvyns lager- och projektinformation behålls.

## Tolkning och avgränsning

Available är Stock minus material reserverat för andra projekt, utleverans eller
vidaretransport. Första projektets egna mottagna delar räknas som tillgängliga.
Required gäller endast första köprojektet. Unprovided är det behov som återstår
efter tillgängligt lokalt lager, användbara arrangerade leveranser, beställd
delproduktion och lokal
utvinning som fyndigheten räcker till. Utvinning är framtida försörjning, inte
material som finns i lager. Uppskattningar är inte löften om leveranstid.

`automatiska-delorder`: Ordered production visar reserverade delorder separat
från Incoming. En fungerande beställning ger Waiting; saknad fabrik, personal,
olöst råvarubrist eller bruten transportväg ger Needs attention. Bara färdiga
delar visas som Awaiting pickup eller In transit. Reservationer för senare
projekt räknas inte som tillgängliga för det första projektet.

`forsorjningsstatus` och `leveransfloden` gäller redan under planeringen:
när ett projekt saknar material och en aktiv transportkedja med tilldelade
Transport ships kan hämta tillgängligt lager, reserveras leveransen direkt
och visas som Awaiting pickup. Fullt täckta behov visas som Waiting och ger
inget försörjningsbeslut. Detta gäller även nya eller omordnade projekt och
inlästa spel. Tidigare reservationer skyddas. Även källplanetens egna nya aktiva
behov skyddas genom att ännu inte påbörjade leveranser vid behov minskas.
Last som redan lämnat
källan behåller sin reservation även vid omlastning. Kvarstående brist eller
en bruten transportkedja kräver fortsatt ett beslut. Lastning och förflyttning
sker när året genomförs.

Leveranser till senare projekt räknas inte av från det första projektets behov.
Last till ett avbrutet projekt kan visas som kommande lager. En bruten fortsatt
transportkedja räknas inte som fungerande försörjning.

Tillfälliga kart- och produktionsval skriver inte om spelet. Alla speltexter är
engelska. Transportregler och sparade spel bevaras.

## Ersatta krav

Den historiska Supply & production-vyn ersatte efter användarbeslut `handelsgraf`,
`handelsgraf-planetoversikt`, `handelsgraf-flottboxar`, `handelsgraf-navigation`,
`handelsgraf-valpanel`, `handelsgraf-kompakt-flottvy`,
`handelsgraf-skeppspositioner`, `handelsgraf-ruttflottor` och
`handelsgraf-lasbarhet`. Beskrivningen i trade-route-graph.md är historik.
Star map-krav och fysisk frakt gäller fortsatt.

## Försörjningssteg i planetens Build queue

`projektens-forsorjningssteg` gäller fortsatt i planetvyn: planetens
Build queue visar behov för varje projekt, även senare order. Lokalt fritt lager
fördelas i köordning efter skyddade reservationer. Egna mottagna komponenter
hör till rätt projekt; samma lager eller ändliga fyndighet täcker inte flera
behov. Framtida utvinning visas som Waiting.

Kopplad delproduktion visas med sin produktionsplanet och råvarubehov.
Transport som ännu inte har en verklig leverans visas som Planned transport.
Awaiting pickup och In transit används för verkliga reserverade leveranser,
med aktuell plats, nästa etapp, hinder och uppskattning när sådan finns.
En annullerad eller felplacerad delorder visas som ett hinder. Vyn visar och
länkar till spelets befintliga order; den väljer inte nya leverantörer eller
transportvägar. Route sammanfattar fortsatt planetens första projekt.
