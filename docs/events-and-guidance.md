# Events och beslutsguidning

Kraven nedan är **Fullständigt implementerat**.

## Händelser

- `senaste-aret-i-events`: efter End turn visar Events senaste årets händelser,
  även i Decisions. Vid vanlig uppdatering inom samma år bevaras en manuellt
  vald läsposition. Inträde i en vy och utfällning visar senaste händelserna.
  Loggen behåller högst 100 äldre/senaste händelser, men klipper aldrig bort
  delar av senaste året om det ensamt har fler än 100 händelser. Sparad
  händelsehistorik och gruppering per år och typ ändras inte.
- `utvikbara-events`: Events kan fällas ut och in via rubriken med touch eller
  tangentbord. Rubriken har minst 44 px träffyta. Infällt läge visar bara
  rubriken. Utfällt läge växer med innehållet upp till tillgängligt utrymme;
  hela senaste året syns när det får plats, annars rullas listan internt.
  End turn och navigation förblir åtkomliga. Utfällningsvalet följer med mellan
  vyer under sessionen och återställs vid omladdning; det sparas inte i spelet.
- `rundkontroller-pa-fler-vyer`: Research och planetvyn har Events och End turn
  i en avsatt nedre rad och stannar kvar under årets genomförande. Decisions
  och kartvyerna behåller sina rundkontroller. På kartan döljs de fortfarande
  när ett informationsval använder samma utrymme enligt `fokuserat-kartval`.
  På andra vyer ersätter de inte formulär eller modala kontroller.

Detta ersätter den tidigare fasta/kompakta konsolhöjden under `handelser`,
dess absoluta gräns på 100 visade händelser och det tidigare utrymmeskravet i
`forskningstradets-utrymme` att inga nedre kontroller reserverar utrymme.
Trädet fyller nu återstående yta efter rubrik, eventuell beslutshjälp och
rundkontroller. `rundkontroller-i-decisions`, sparad kronologi och befintlig
bekräftelse vid obesvarade beslut behålls. End turn är spärrad under simulering.

## Vägledning vid beslut

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
