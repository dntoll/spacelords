# Events och beslutsguidning

Kraven nedan är **Fullständigt implementerat**.

## Händelser

- `stridsresultat-utan-upprepning`: stridsrutans huvudtext visar förluster,
  förstörda pirater och överlevande en gång. Detaljerna behåller plats,
  flotta, återstående rörelse och antal vrak men upprepar inte resultatet.
  Kravet är **Fullständigt implementerat** och förtydligar
  `gemensamt-handelseflode` och `stridsrapport-i-dialog`. Sparad historik och
  stridsresultat bevaras.

- `upptacktsbesked-utan-pausmening`: upptäcktsrutan visar inte längre
  meningen “The year is paused. Fleets already sharing a hex will fight
  before the next movement.” Plats, flotta, återstående rörelse och
  Handle/Ignore behålls. Kravet är **Fullständigt implementerat** och
  förtydligar textinnehållet i `gemensamt-handelseflode`.

- `centrerade-handelseval-pa-dator`: på stora datorskärmar ligger händelsens
  plats och valruta tillsammans kring kartans mitt i stället för vid
  överkanten. Platsen, ringen och etiketten ligger fortsatt ovanför textrutan.
  Handle och Ignore är synliga även när fönstret ändrar storlek. Små skärmar
  behåller sin kompakta placering med plats för knappar och End turn.
  Kravet är **Fullständigt implementerat** och förtydligar
  `gemensamt-handelseflode` och `handelseannonsering`; det ersätter den
  överkantnära placeringen på stora skärmar från 2026-10-27.

- `grupperade-transporthandelser`: en transportflottas ankomst och hela
  lossade last visas som ett enda besked med flottans namn, planet och mängd
  per råvara eller komponent. Flera lastposter av samma material summeras.
  Olika flottor får egna besked även vid samma planet och år. Beskedet kommer
  när lasten faktiskt lossas; en tom ankomst behåller sitt vanliga besked.
- `ett-meddelande-per-skeppsbygge`: varje färdigbyggt skepp ger ett enda
  produktionsbesked med skeppstyp och planet. Det gäller alla skeppstyper.

Ändring 2026-10-30: dessa krav förtydligar `handelser` och ersätter separata
ankomst- och lastbesked för samma leverans samt dubbla besked för samma
skeppsbygge. Samma samlade besked används i annonseringen och Events.
Lossning, produktion och sparformat behåller sina regler. Äldre sparade
händelsetexter bevaras.

- `gemensamt-handelseflode`: upptäckter, piratkontakter och stridsrapporter
  använder samma kartmarkering, textruta och förflyttning till Events som andra
  händelser. De visas en i taget i verklig händelseordning, med Handle och Ignore
  samt HEX, berörd flotta, återstående rörelse och relevanta strids- och
  vrakuppgifter. Endast information spelaren redan får se visas.
  Året pausas vid samma tillfällen som tidigare. Rutan väntar tills spelaren
  väljer. Ignore flyttar händelsen till listan och visar nästa. Handle flyttar
  den till listan och öppnar berörd flotta för order; saknas en flotta fokuseras
  platsen. Give orders to other fleets behålls som uttryckligt val. Continue
  avslutar hanteringen och visar nästa obesvarade händelse. Först när hela
  avbrottet är avklarat fortsätter simuleringen, med uppskjuten strid före nästa
  rörelse. Ignore i en stridsrapport fortsätter utan nya order och ändrar inte
  resultatet. Inget annonseras två gånger. Långa uppgifter rullas internt;
  knapparna är åtkomliga med touch och tangentbord och har minst 44 px träffyta.
  End turn är synlig och spärrad under hela flödet. Omladdning återställer nästa
  obesvarade händelse eller pågående hantering, utan upprepad rörelse, strid
  eller produktion. Äldre sparningar kan fortsatt läsas.

- `senaste-aret-i-events`: Events visar bara senaste årets händelser, i den
  ordning de inträffade. Äldre år behålls i sparningen men tar ingen plats i
  listan. Alla senaste årets händelser finns kvar, även fler än 100 och
  Population changes med +0. Vanliga uppdateringar inom året bevarar manuellt
  vald läsposition. Nytt år och utfällning visar senaste händelserna.
- `utvikbara-events`: Events kan fällas ut och in via rubriken med touch eller
  tangentbord. Rubriken har minst 44 px träffyta. Infällt läge visar bara
  rubriken. Utfällt läge växer med innehållet upp till tillgängligt utrymme;
  hela senaste året syns när det får plats, annars rullas listan internt.
  End turn och navigation förblir åtkomliga. Utfällningsvalet följer med mellan
  vyer under sessionen och återställs vid omladdning; det sparas inte i spelet.
- `rundkontroller-pa-fler-vyer`: alla spelvyer, inklusive planetens undersidor
  och Build selection, har samma Events och End turn i en avsatt nedre rad.
  Kartan visas tillfälligt under årets uppspelning; därefter återkommer den
  tidigare vyn. På andra vyer ersätter kontrollerna inte formulär eller modaler.
- `end-turn-vid-kartval`: End turn förblir synlig vid planet-, flott-, rutt-
  och destinationsval i samtliga kartlägen. Informationspanelen lämnar egen
  plats för knappen och kan rullas utan att täcka den. Events kan fortfarande
  användas vid kartval enligt `gemensam-events-panel`. Beslutsvarningen behålls.
- `sekventiella-arshandelser`: nya händelser visas en i taget i verklig
  ordning fram till varje avbrott och efter årets slut. End turn är synlig men spärrad under simulering och
  presentation. Inga nya order utförs medan presentationen pågår.
  Upptäckts- och stridsavbrott behålls före årets avslut.
- `en-flotta-i-taget`: varje synlig flottmarkör följer hela sin färd innan
  nästa flottmarkör animeras. Kameran följer den rörliga flottan. Spelets
  förflyttning, strider och upptäckter behåller sina befintliga regler.
- `osynliga-flottor-utan-animation`: dolda flottors rörelser animeras inte,
  flyttar inte kameran och ger ingen animationsväntan. En fientlig
  förflyttning visas bara när flottan syns vid båda ändarna av steget.
- `handelseannonsering`: varje annan händelse annonseras som stor text i en
  textruta. För platsbundna händelser ligger hela rutan under platsens ring och
  etikett, så att händelseplatsen förblir synlig och i fokus. Rutan följer
  platsen även när skärmen roteras. Globala händelser visas mitt på skärmen.
  Vanliga händelsers text ligger kvar läsbar i 1,4 sekunder
  och flyttas sedan ned till sin plats i Events under 0,45 sekunder. Först
  därefter läggs raden i listan och nästa händelse annonseras. Det finns ingen
  meny med Pause/Play, Next eller Skip. Vid minskad rörelse behålls text och
  resultat medan rörelseanimationerna utelämnas.
- `handelser-pa-kartan`: en platsbunden händelse centreras och markeras med
  ring och etikett på kartan medan dess text annonseras. Globala händelser
  annonseras utan påhittad kartposition. Listan ligger under
  kartan på stående mobil och bredvid på liggande mobil och bredare skärmar.
  Den växer efter årets innehåll upp till tillgängligt utrymme, med intern
  rullning därefter. Tidigare vy, giltiga objektval och kamera återställs när
  presentationen är klar. Det gäller även Research,
  Decisions och planetvyn. Händelser avslöjar ingen dold information.

Ändring 2026-10-27: `gemensamt-handelseflode` ersätter den separata
upptäckts- och stridsdialogen, gruppvalet för flera samtidiga upptäckter och
återannonseringen efter årets slut. Det förtydligar `upptacktsavbrott`,
`order-under-upptacktsavbrott`, `spara-avbrutet-ar`, `stridsrapport-i-dialog`,
`sekventiella-arshandelser` och `handelseannonsering`. De stabila kravnamnen
behålls, inklusive det historiska namnet `stridsrapport-i-dialog`.

Ändring 2026-10-27: `handelseannonsering` ersätter kontrollmenyn och det
fasta 1,5-sekunderssteget i `sekventiella-arshandelser` på uttrycklig beställning.
Senare samma dag ersätter placering under händelseplatsen den tidigare
skärmcentreringen för platsbundna händelser, enligt användarens bildexempel.
`en-flotta-i-taget` ersätter den tidigare samtidiga presentationen av
flottmarkörer; simuleringens regler ändras inte. Äldre sparningar bevaras.

Ändring 2026-10-26: detta ersätter `handelser-grupperade-per-ar-och-typ`,
historikfönstret med äldre år i `senaste-aret-i-events` och delen av
`fokuserat-kartval` som dolde End turn. Stabilt kravnamn för det ersatta
grupperingskravet behålls i ändringshistoriken.

Tidigare ändringar ersatte den fasta/kompakta konsolhöjden under `handelser`,
dess absoluta gräns på 100 visade händelser och utrymmeskravet i
`forskningstradets-utrymme` att inga nedre kontroller reserverar utrymme.
Trädet fyller nu återstående yta efter rubrik, eventuell beslutshjälp och
rundkontroller. `rundkontroller-i-decisions`, sparad kronologi och befintlig
bekräftelse vid obesvarade beslut behålls. Årets resultat sparas före
uppspelningen; omladdning visar senaste årets fullständiga lista utan att
genomföra året igen. Äldre sparningar utan händelsepositioner kan fortfarande
läsas. Sparade spel rensas inte.

## Vägledning vid beslut

`direkt-atgard-fran-rundvarning` — **Fullständigt implementerat**:
varje aktivt beslut i Decisions remaining har en egen Review-knapp efter
beskrivningen. Den stänger varningen och öppnar beslutets relevanta vy och
objekt direkt: exempelvis Choose research till forskningsträdet, byggval till
Production, flottorder till Fleets och ruttproblem till Route. Samma
beslutsmål används som i Decisions. Året avslutas inte av Review.
End turn anyway och Cancel behålls. Tystade och överhoppade beslut tas
fortsatt inte med. Knapparna har tydliga tillgänglighetsnamn och minst 44 px
träffyta; längre beskrivningar radbryts.

Ändring 2026-10-30: detta ersätter den gemensamma knappen Review decisions
som tidigare skickade spelaren via Decisions, och förtydligar `rundvarning`
och `beslutslista`.

`beslutsvagledning-i-vyn` kompletterar `beslutsmarkering-pa-flikar`:

- Hjälpen har egen plats ovanför kartan så att den inte täcker byggval eller
  andra kartkontroller. Flera råd kan rullas internt.
- Bara aktuella beslut som varken är tystade eller överhoppade ger vägledning.
  Samma målfunktion används för ! på fliken, Review, Show och hjälpen i vyn.
- Fleets ringar in flottan som behöver en order. Show väljer den och dess
  kort samt Orders markeras. Hjälpen beskriver destination, skeppsöverföring
  och tilldelning av transport till en rutt.
- Research markerar forskningsträdet och tillgängliga forskningsval samt
  förklarar att spelaren väljer en teknik för att köa forskning.
- Production ringar in planeten som saknar ett byggval. Vald planets byggval
  och kö markeras, med hjälp att välja ett alternativ och beställa. Befintliga
  problem med material eller personal har fortsatt sina problemmarkeringar och
  får kort åtgärdshjälp för projekt, fabrik eller bemanning.
- Route behåller markeringar av berörda rutter och planeter. Show öppnar rätt
  information. Hjälpen förklarar hur en lila ledig transportflotta väljs och
  tilldelas via Trade routes eller hur planetens försörjning granskas.
- När beslutet blir löst, tystat eller överhoppat försvinner vägledningen och
  riktade markeringar. Normala val-/hovringsmarkeringar behålls. Röd ring
  betyder fortsatt ett verkligt försörjningsproblem; gul markering guidar till
  ett orderval eller en kontroll. Förklaringen finns som text och markeringar
  hänvisar till den även för hjälpmedel.

Guidningen utför inte någon order automatiskt. Alla navigerings- och
spelhandlingar går via befintliga controllers. Kartan, kameran och
försörjningsreglerna behålls.

## Väntan på påbörjade åtgärder

`beslut-vantar-pa-paborjad-atgard` förtydligar `beslutslista`:

- En planet utan andra produktionsval väntar på köad forskning av rätt Dome.
  En förberedd byggplats eller befintlig produktionsfabrik behåller sitt val.
  Köad Dome visas som väntan; när forskning eller bygge är klart visas nästa
  manuella steg. Avbrutna åtgärder återaktiverar beslutet direkt.
- Relevant fabriksforskning eller ett tidigare beställt fabriksbygge ersätter
  uppmaningen att påbörja samma åtgärd. En fabrik bakom sitt beroende projekt
  ger i stället ett beslut om att ändra köordningen.
- Rutter utan kapacitet väntar när Transport ship factory forskas fram,
  fabriken byggs eller Transport ship tillverkas. Detta gäller alla berörda
  rutter. Ett transportskepp som kan tilldelas ger alltid ett nytt ruttbeslut,
  även när fler skepp byggs. Efter varje avslutad förberedelse uppmärksammas
  nästa manuella steg.
- Följdproblem med material visar Waiting när en befintlig ruttförbindelse
  väntar på transportförberedelsen och tillräckligt tillgängligt lager finns,
  eller när beställd komponentproduktion väntar på en relevant åtgärd.
  Samma lager får inte täcka flera behov. Mängder, reservationer och verklig
  fraktkapacitet ändras inte av väntestatusen.
- Beslut finns kvar för grundproblemet i en blockerad förberedelse och för
  oberoende brister. Saknad rutt, otillräckligt material, avbruten produktion
  och fel köordning får inte beskrivas som ordnad försörjning. Saknad sista
  Research station ger ett byggbeslut om ingen ersättning redan beställts.
- Väntande följdproblem ger ingen beslutsräkning, flikmarkering, riktad
  vägledning, problemmarkering eller rundvarning. Vanlig statusinformation
  finns kvar. Mute och Unmute behåller sina sparade inställningar.

Regeln gäller produktion och transport. Personal, varv och bärgning behåller
sina tidigare beslutsregler. Ett hinder hos en komponentleverantör visas vid
källan; mottagaren väntar på sin beställda produktion.
