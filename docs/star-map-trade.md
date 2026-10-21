# Handelsrutter på Star map

Star map administrerar handelsnätverket. Supply & production ersätter den separata
handelsgrafen och visar materialförsörjning och produktion. På Star map visas
alla flottor vid sin verkliga position.

## Krav och status

- `handelsrutt-skapande-pa-stjarnkartan` — **Fullständigt implementerat**:
  markera en ägd planet och dra från dess symbol till en annan ägd planets hex.
  Förhandsvisningen visar ändplaneternas namn och om målet är giltigt. Släpp
  skapar och väljer rutten utan att ändra kameran. Create route i planetens
  informationsruta låter spelaren välja mål genom klick, Known objects eller
  kartans tangentbordsnavigering. Cancel och Escape avbryter. Trade logistics
  och planning krävs; samma planet, främmande planeter, tom rymd och dubbla
  rutter godtas inte. Låsta knappar visar orsaken.
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
- `flottilldelning-pa-stjarnkartan` — **Fullständigt implementerat**:
  dra en flottmarkör till en ruttlinje eller använd Assign i informationsrutan.
  Förhandsvisningen skiljer tilldelning från vanlig destination och visar
  orsaken vid ogiltig tilldelning. Flottan måste vara ledig, ha transportskepp
  och ha en position, utan resa eller förstärkningsuppdrag. Tilldelning på
  avstånd följer `ruttflotta-till-narmaste-andplanet` och ersätter uttryckligen
  det tidigare kravet att flottan redan står vid en ändplanet. Vid flera
  träffade rutter väljer spelaren mål innan någon order ges. Ogiltigt ruttsläpp
  ger aldrig en flyttorder. Utanför linjerna behålls vanlig flottförflyttning;
  Set destination är fortsatt ett uttryckligt flyttläge.

Escape, avbruten pekare och en andra touchpunkt avbryter orderförhandsvisningar.
Två fingrar kan därefter panorera och zooma. Val och förhandsvisningar är
tillfälliga; rutter och flottuppdrag sparas och syns i båda vyerna efter omladdning.
Fraktmekanik och sparformat ändras inte.
