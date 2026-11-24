# Events

**Ersatt 2026-11-24:** Events-listan, annonseringarna och uppspelningen i
slutet av rundan är borttagna. Händelser visas i stället direkt som korta
notiser högst upp (`handelser-som-toppnotis`, se
[rundan och händelser](areas/turn-and-decisions.md)). Beskrivningarna nedan
av lista, annonsering och kamera är historik och gäller inte längre.

## Bilder i händelser

`bilder-i-events` är **Fullständigt implementerat**. Events-listan och
rundans uppspelning visar en illustration per rad: stjärnor, planeter,
skepp och forskning. Texten bevaras vid bildfel. Planetbesked,
delproduktion (`delproduktion-med-sammanhang`), byggnadsbilder och
komponentsymboler är borttagna med planetekonomin (`single-fleet-rensning`).

Kraven nedan är **Fullständigt implementerat** om inget annat anges.

Förtydligande efter sluttest 2026-10-30: `gemensamt-handelseflode` behåller
händelserutans Handle och Ignore ovanför End turn även på låga, liggande
telefoner. När avståndet till kartmarkeringen inte ryms flyttas rutan uppåt;
informationen kan rullas inom rutan. End turn får inte täckas.

## Händelser

- `round-i-speltexter` — **Fullständigt implementerat**: Spelets synliga texter
  och tillgänglighetstexter använder `round` för tidssteg i stället för `year`.

- `ingen-ankomstbesked`: ankomstmeningen skapas inte, annonseras inte och
  hamnar inte i Events. Målet rensas när flottan är framme. Kravet är
  **Fullständigt implementerat** och ersätter
  `ankomstbesked-endast-vid-manuell-forflyttning`.

- `stridsresultat-utan-upprepning`: stridsrutans huvudtext visar förluster,
  förstörda pirater och överlevande en gång. Detaljerna behåller plats,
  flotta, återstående rörelse och antal vrak men upprepar inte resultatet.
  Kravet är **Fullständigt implementerat** och förtydligar
  `gemensamt-handelseflode` och `stridsrapport-i-dialog`. Sparad historik och
  stridsresultat bevaras.

- `upptacktsbesked-utan-pausmening`: upptäckten visas som en kort blänkare
  utan pausmening och utan Handle eller Ignore (`upptackt-stannar-resan`).
  Kravet är **Fullständigt implementerat**.

- `centrerade-handelseval-pa-dator`: på stora datorskärmar ligger händelsens
  plats och valruta tillsammans kring kartans mitt i stället för vid
  överkanten. Platsen, ringen och etiketten ligger fortsatt ovanför textrutan.
  Handle och Ignore är synliga även när fönstret ändrar storlek. Små skärmar
  behåller sin kompakta placering med plats för knappar och End turn.
  Kravet är **Fullständigt implementerat** och förtydligar
  `gemensamt-handelseflode` och `handelseannonsering`; det ersätter den
  överkantnära placeringen på stora skärmar från 2026-10-27.

Ändring 2026-10-30: dessa krav förtydligar `handelser` och ersätter separata
ankomst- och lastbesked för samma leverans samt dubbla besked för samma
skeppsbygge. Samma samlade besked används i annonseringen och Events.
Lossning, produktion och sparformat behåller sina regler. Äldre sparade
händelsetexter bevaras.

- `gemensamt-handelseflode`: upptäckter och piratkontakter
  använder samma kartmarkering, textruta och förflyttning till Events som andra
  händelser. De visas en i taget i geografisk presentationsordning, med Handle och Ignore
  samt HEX, berörd flotta, återstående rörelse och relevanta strids- och
  vrakuppgifter. Endast information spelaren redan får se visas.
  Året pausas vid samma tillfällen som tidigare. Rutan väntar tills spelaren
  väljer. Ignore flyttar händelsen till listan och visar nästa. Handle flyttar
  den till listan och öppnar berörd flotta för order; saknas en flotta fokuseras
  platsen. Give orders to other fleets behålls som uttryckligt val. Continue
  avslutar hanteringen och visar nästa obesvarade händelse. Först när hela
  avbrottet är avklarat fortsätter simuleringen, med uppskjuten strid före nästa
  rörelse. Ändring 2026-10-31: stridsresultat visas direkt på stridskartan;
  rapporten sparas i Events utan informationsruta eller Handle/Ignore efteråt
  enligt `stridsrapport-i-dialog`. Inget annonseras två gånger. Långa uppgifter rullas internt;
  knapparna är åtkomliga med touch och tangentbord och har minst 44 px träffyta.
  End turn är synlig och spärrad under hela flödet. Omladdning återställer nästa
  obesvarade händelse eller pågående hantering, utan upprepad rörelse, strid
  eller produktion. Äldre sparningar kan fortsatt läsas.

- `senaste-aret-i-events`: Events visar bara senaste årets händelser, i den
  ordning de inträffade. Äldre år behålls i sparningen men tar ingen plats i
  listan. Alla senaste årets händelser finns kvar, även fler än 100.
  Population rapporteras bara vid ändring. Nya händelser, nytt år och
  utfällning rullar listan till senaste posten. Läsposition mellan vyer
  bevaras bara när listan inte har fått nya poster.
- `utvikbara-events`: Events kan fällas ut och in via rubriken med touch eller
  tangentbord. Rubriken har minst 44 px träffyta. Infällt läge visar bara
  rubriken. Utfällt läge växer med innehållet upp till tillgängligt utrymme;
  hela senaste året syns när det får plats, annars rullas listan internt.
  End turn och navigation förblir åtkomliga. Utfällningsvalet följer med mellan
  vyer under sessionen och återställs vid omladdning; det sparas inte i spelet.
- `end-turn-vid-kartval`: End turn förblir synlig vid planet-, flott-
  och destinationsval i samtliga kartlägen. Informationspanelen lämnar egen
  plats för knappen och kan rullas utan att täcka den. Events kan fortfarande
  användas vid kartval enligt `gemensam-events-panel`.
- `sekventiella-arshandelser`: nya händelser visas en i taget enligt
  `geografisk-arsuppspelning` fram till varje avbrott och efter årets slut. End turn är synlig men spärrad under simulering och
  presentation. Inga nya order utförs medan presentationen pågår.
  Upptäckts- och stridsavbrott behålls före årets avslut.
- `en-flotta-i-taget`: manuella Move-flottor följer var och en hela sin färd
  innan nästa flottmarkör animeras. Kameran står stilla under färden.
- `destinationer-for-aktiva-skepp`: under årets presentation kan bara
  flottorna som rör sig i det aktuella steget visa destinationspilar.
  Pilar visas i Fleets och för vald flotta även på Star map, enligt
  `destinationspilar-endast-i-flottvyn` och
  `vald-flotta-visar-destinationspil`.
  Stillastående flottors pilar döljs under uppspelning och händelseannonsering. Kravet är
  **Fullständigt implementerat**.
- `geografisk-arsuppspelning`: färder visas från vänster till höger utifrån startplatsen. Vid samma
  horisontella läge visas den nedre först. Därefter annonseras platsbundna
  händelser i samma geografiska ordning; händelser på samma plats behåller
  sin inbördes ordning. Globala och äldre positionslösa händelser visas sist
  i sin ursprungliga ordning, utan kameraflytt. Varje avbrott avslutar den
  aktuella gruppen innan nästa del av året simuleras. Sparad händelsekronologi,
  spelregler och tidigare kartläges återställning behålls. Kravet är
  **Fullständigt implementerat**.
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
  presentationen är klar. Det gäller även Research. Händelser avslöjar ingen dold information.

Ändring 2026-10-31: `geografisk-arsuppspelning` ersätter kravet på verklig
presentationsordning i `sekventiella-arshandelser` och
`gemensamt-handelseflode`. Sparad kronologi i `senaste-aret-i-events` behålls.
`destinationer-for-aktiva-skepp` begränsar `kartflottor` under uppspelningen.
`vald-flotta-visar-destinationspil` visar den valda flottans pil även på
Star map. Detta är en uttrycklig ändring av tidigare presentationskrav.

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
rundkontroller. Sparad kronologi behålls. Årets resultat sparas före
uppspelningen; omladdning visar senaste årets fullständiga lista utan att
genomföra året igen. Äldre sparningar utan händelsepositioner kan fortfarande
läsas. Sparade spel rensas inte.

## Borttaget med `single-fleet-rensning`

Beslutsvägledningen, väntan på påbörjade åtgärder, åtgärder för
rutttransport och planetbeskeden är borttagna med `Decisions` och
planetekonomin. Kravnamnen listas i
[Rundan och händelser](areas/turn-and-decisions.md).
