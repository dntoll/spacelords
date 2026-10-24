# Handelsrutter på Star map

Star map och Route administrerar handelsnätverket. Route och Production ersätter den separata
handelsgrafen och visar materialförsörjning och produktion. På Star map visas
alla flottor vid sin verkliga position.

## Krav och status

- `streckade-rutter-utan-transporter` — **Fullständigt implementerat**:
  rutter utan aktiv tilldelad transportflotta visas streckade, även när de är
  markerade eller hovrade. En tilldelad flotta under anslutningsresa räknas som
  aktiv; en flotta utan Transport ship, utan position eller med Release gör det
  inte. Öppna rutter med aktiv transport visas heldragna. Stängande rutter
  förblir streckade. Linjemönstrets skärmstorlek behålls vid zoom och hela
  ruttlinjen går fortsatt att välja.

- `handelsrutt-skapande-pa-stjarnkartan` — **Fullständigt implementerat**:
  markera en ägd planet och dra från dess symbol till en annan ägd planets hex.
  Förhandsvisningen visar ändplaneternas namn och om målet är giltigt. Släpp
  skapar och väljer rutten utan att ändra kameran. Knappen Create route är
  borttagen efter användarens ändring. R med fokus på kartan börjar en rutt
  från markerad ägd planet; målet kan väljas genom klick, Known objects eller
  kartans tangentbordsnavigering. Cancel och Escape avbryter. Trade logistics
  och planning krävs; samma planet, främmande planeter, tom rymd och dubbla
  rutter godtas inte. Ogiltiga mål får en förklaring i förhandsvisningen.
  Detta ersätter panorering från själva den markerade planetsymbolen;
  panorering från tom kartbakgrund behålls.
- `handelsrutt-val-pa-stjarnkartan` — **Fullständigt implementerat**:
  ruttlinjer kan väljas och markeras. Kartans informationsruta visar ändplaneter,
  status, kapacitet, väntande material och alla tilldelade flottor med skepp,
  antal, last, verklig position och väntande frigörande. Close route och Release
  använder befintliga regler för leveranser och lossning. Stängande rutter har
  särskild linjestil; när rutten tas bort försvinner ruttinformationen.
  Flottnamnet väljer flottans kartinformation och dess rutt kan väljas därifrån.
  Ägda planeter visar Connected routes. Flottor och planetsymboler har företräde
  framför ruttlinjer; överlappande linjer ger ett val mellan träffade rutter.
  Ruttpanelen listar enbart redan tilldelade flottor. Den globala listan
  Assign fleet över otilldelade flottor är borttagen, även för närbelägna flottor.
- `flottilldelning-pa-stjarnkartan` — **Fullständigt implementerat**:
  dra en flottmarkör till en ruttlinje. Alternativet utan drag utgår från
  vald flottas Trade routes, utan någon global flottlista i ruttpanelen.
  Förhandsvisningen skiljer tilldelning från vanlig destination och visar
  orsaken vid ogiltig tilldelning. Flottan måste vara ledig, ha transportskepp
  och ha en position, utan resa eller förstärkningsuppdrag. Tilldelning på
  avstånd följer `ruttflotta-till-narmaste-andplanet` och ersätter uttryckligen
  det tidigare kravet att flottan redan står vid en ändplanet. Vid flera
  träffade rutter väljer spelaren mål innan någon order ges. Ogiltigt ruttsläpp
  ger aldrig en flyttorder. Utanför linjerna behålls vanlig flottförflyttning;
  Orders → Choose destination ger ett uttryckligt flyttläge utan drag och
  ersätter knappen Set destination enligt `flottknappar-pa-kartan`.

Escape, avbruten pekare och en andra touchpunkt avbryter orderförhandsvisningar.
Två fingrar kan därefter panorera och zooma. Val och förhandsvisningar är
tillfälliga; rutter och flottuppdrag sparas och syns i båda vyerna efter omladdning.
Fysisk frakt följer [ekonomireglerna](economy-logistics.md). Delbeställningar
och deras reservationer bevaras i sparformat version 4.
