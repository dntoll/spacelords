# Senaste fabriksteknik och uppgraderingar

`senaste-teknik-i-byggval` — **Fullständigt implementerat**: Build selection
och båda produktionsvyerna visar bara den högsta utforskade versionen av
både komponenter och fabriker i varje versionskedja.
Telescope III factory ersätter Telescope I factory och
Telescope II factory; Ion pulse engine factory ersätter Rocket engine factory.
Även Telescope I–III och Rocket engine → Ion pulse engine följer samma regel.
En komponent behöver fortsatt en matchande färdig fabrik för att kunna väljas;
äldre komponentval döljs även om den nya fabriken inte har byggts än.
Köad forskning räknas inte som färdig. Andra fabriker och miljöbundna
terraformingtekniker är separata alternativ.

`uppgradera-obsoleta-fabriker` — **Fullständigt implementerat**: en äldre
fabrik kan uppgraderas direkt till den senaste utforskade versionen från
Building sites. Upgrade visar målversion och materialkostnad. Uppgraderingen
kostar samma material som en ny fabrik av målversionen och använder den
gemensamma Build queue, med högst ett färdigt projekt per planet och år.
Den använder befintlig byggplats och bemanning, även på en full planet,
och bevarar eventuell Dome. Fabriken fortsätter fungera som tidigare tills
uppgraderingen slutförs. Ny teleskopräckvidd gäller därefter.

Uppgraderingen väntar vid brist på material eller arbetskraft. Endast en
uppgradering per fabrik kan vara köad. Cancel upgrade behåller den gamla
fabriken och förbrukar inga material. En köad uppgradering måste avbrytas
före Demolish. Om bättre teknik forskas fram efter beställningen behåller
den köade uppgraderingen sin valda målversion.

Befintliga fabriker, komponentlager och produktorder tas inte bort när bättre
teknik blir tillgänglig. Äldre fabriker kan slutföra redan beställda delar
tills de uppgraderas. Nya manuella val visar bara senaste versionen.
En produktorder kräver fortsatt en fabrik som kan tillverka den beställda
komponenten; om sista matchande fabrik uppgraderas
före ordern väntar den enligt vanliga produktionsregler.

## Förtydliganden av tidigare krav

Beställningen 2026-10-31 ersätter visningen av samtliga upplåsta versioner
i `visa-byggalternativ`, `byggkategorier`, `delfabriker` och
`teleskopfabriker`. Kraven tillåter nu uppgradering på samma plats utan
föregående rivning. `gemensam-planetko` gäller även uppgraderingar.
Inga sparningar rensas; äldre spel och nya köade uppgraderingar bevaras vid
omladdning.
