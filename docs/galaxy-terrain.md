# Galax, terräng och utforskning

Beslut 2026-10-26. Speltexter återges med sina engelska namn.

| Kravnamn                     | Status                     | Spelarens beteende                                                                                                                                                                                              |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utokad-galax`               | Fullständigt implementerat | Nya spel har radie 100, 30 301 hexar och 150 reproducerbara system med tre planeter vardera i diffusa spiralarmar. Detta ersätter tidigare 300 system; sparade galaxer behålls.                                 |
| `planetavstand-till-stjarna` | Fullständigt implementerat | Planeter ligger två hexsteg från sin stjärna, med en tom hex emellan. Alla planeter går att nå.                                                                                                                 |
| `stjarnornas-hexutseende`    | Fullständigt implementerat | Stjärnor har olika färg och storlek, helt utan spikes. Texturerad plasmayta och korona i närbild hålls med marginal innanför hexen. Vid utzoomning förenklas de till glöd och ljuspunkter.                      |
| `ofarbara-stjarnhexar`       | Fullständigt implementerat | Flottor får varken resa in i eller passera stjärnhexar. Ogiltig destination ersätter inte befintlig order.                                                                                                      |
| `asteroidbalten`             | Fullständigt implementerat | Dense asteroid belt är ofarbar. Ett steg in i eller ut ur Sparse asteroid belt kräver hela årets rörelsebudget och avslutar förflyttningen oavsett motor. Har flottan redan flyttat väntar den till nästa år.   |
| `nebulosornas-sikt`          | Fullständigt implementerat | Nebula döljer sitt innehåll för observatörer utanför hexen. En observatör inuti ser enbart sin egen hex, oavsett teleskop. Molnet blockerar sikt till bakomliggande hexar. Flera observatörers synfält förenas. |
| `engangsreset-utokad-galax`  | Fullständigt implementerat | Alla tre äldre sparplatser rensas en gång vid denna leverans, efter uttryckligt användargodkännande. Nya spel bevaras därefter.                                                                                 |

## Utforskning

`automatisk-hexutforskning` ändras uttryckligen: Explore fyller luckor och de
innersta gränslagren räknat från hemplaneten före längre utflykter. Närliggande
mål inom samma lager prioriteras. Kända ofarbara mål hoppas över.

`automatisk-stjarnutforskning` ändras uttryckligen: Explore stars väljer en
nåbar outforskad stjärna, närmar sig dess grannhex och tar ett helt varv runt
de sex grannhexarna tillbaka till varvets start. Detta upptäcker planeterna på
två hexstegs avstånd. Varvet slutförs även om stjärnan upptäcks under
inflygningen. Därefter väljs nästa stjärna. Redan utforskade stjärnor behöver
inga retroaktiva varv. Avbrott och omladdning bevarar pågående varv; manuella
ersättningsorder avbryter det.

## Terräng och färdvägar

Stjärnpositioner är fortsatt kända från start. Terrängen avslöjas med sikt och
minns därefter. Nebulosans yttre moln kan observeras utan att innehållet avslöjas.
Okända hexar behandlas som vanlig rymd vid färdplanering. Nyupptäckta hinder ger
omplanering; flottan går aldrig in i ett ofarbart hinder. Saknas väg behålls
ordern med en förklaring. Samma rörelseregler gäller handel, förstärkningar,
patruller och bärgning. Nebulosor begränsar inte rörelsefarten.

Terrängen bildar bälten och moln i tomma hexar. Stjärnornas grannhexar och
hemsystemets närmaste omgivning hålls fria. Planeter och stjärnor överlappar
inte terräng. Varje planet har en möjlig väg från hemvärlden.

## Ersatta regler

Detta ersätter den tidigare storleken och systemantalet i `fast-exempelvarld`,
direkt angränsande planeter i `hexkarta` och fri passage genom alla karthexar i
`rakare-hexforflyttning`. Rakaste kortaste färd behålls där rymden är fri.
`aktuell-detektionssikt` och `kartans-sikttillstand` kompletteras med
nebulosornas sikthinder och separat minne av terrängens yta.

Godkännandet av denna rensning gäller endast `engangsreset-utokad-galax` och
ersätter inget framtida krav på avstämning enligt `avstamning-sparkompatibilitet`.

## Verifiering

Regressionstestet för västlig utforskning misslyckades före rättningen.
Kravkopplade enhetstester skyddar galaxens nåbarhet, stjärnornas utseende,
terräng, sikt, fullständiga stjärnvarv och sparning. Asteroidstegets rörelsebudget
bevaras genom upptäcktsavbrott, ändrad order och omladdning.

Fyra nya mobilscenarier och 20 riktade regressioner för utforskning, patrullering
och bärgning är godkända i telefon Chromium och WebKit. Skärmbilder har granskats.
Terrängförklaringar visas även på mobil och vald hex döljer inte terrängen.

## Utökad utzoomning

`utokad-utzoomning` — **Fullständigt implementerat**: Kartan kan zoomas ut till
3 procent i alla kartlägen. Vid kraftig utzoomning utelämnas det täta rutnätet
och andra namn än den valda himlakroppens, så galaxen förblir överskådlig.
Home återställer hemvyn och 100 procent. Ändringen kompletterar `kartnavigation`.

Förtydligandet av `stjarnornas-hexutseende` ersätter den platta cirkeln som
fyllde hela hexens inskrivna cirkel. [Bild och prompt](star-artwork.md) finns
bevarade. Bilden används också i sparplatsernas översikt.

Regressionstester för hexklippning och zoomgräns misslyckades före rättningen.
Närbild och galaxöversikt är verifierade i telefon Chromium och WebKit.
De tolv riktade ritlagertesterna för kartlägena är också godkända.
