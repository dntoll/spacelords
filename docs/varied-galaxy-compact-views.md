# Varierad galax och kompakta spelvyer

Beslut 2026-10-27. Befintliga sparade spel bevaras.

| Kravnamn                         | Status                     | Spelarens beteende                                                                                              |
| -------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `stjarnvariation`                | Fullständigt implementerat | Stjärnor har stabila olika färger och storlekar, utan spikes. Detaljnivån minskar med utzoomningen.             |
| `galaxarmar`                     | Fullständigt implementerat | Nya galaxer har 150 system i tre oregelbundna spiralarmar med tomrum och en mindre andel system mellan armarna. |
| `dragbara-flottorder`            | Fullständigt implementerat | Orderraden kan dras med vänster musknapp utan att en order aktiveras.                                           |
| `kompakt-forskningstrad`         | Fullständigt implementerat | Små forskningsrutor visar symbol och namn utan factory på högst två rader. Färg och små markörer visar status.  |
| `forskningens-avslojande`        | Fullständigt implementerat | Färdig, köad, återfunnen och nästa tillgängliga forskning identifieras. Senare nivåer visas anonymt.            |
| `forskningsdetaljer-vid-val`     | Fullständigt implementerat | Val öppnar en kompakt detaljpanel med separat Research-knapp.                                                   |
| `produktionsvalens-statusfarger` | Fullständigt implementerat | Byggnader, varor och skepp visar färger för lokal förekomst, aktivt nätverk, byggkö och avsaknad.               |

Ändringen ersätter spikes-regeln i `stjarnornas-hexutseende` och antalet
300 nya system i `utokad-galax`. Radie 100 och planetavstånd två behålls.
`utokad-utzoomning` kompletteras: outforskade hexars rutnät döljs under
50 procent zoom. Gamla galaxer behåller sina objekt, positioner och terräng.

Production använder grönt för färdigt lokalt, blått för färdigt på en annan
ägd planet i det aktiva transportnätverket, gult för enbart köat där och grått
för saknat. Lokal förekomst går före nätverk, som går före kö. Köade exemplar
markeras även när färdiga finns. Varor bedöms efter lager och skepp efter faktisk
position vid planeten. Frakt är inte planetlager. Flera aktiva handelsled kan
koppla samman planeter; enbart skapade eller stängande rutter räcker inte.

Senaste ändring 2026-10-30: trädet visas samtidigt med en mindre, fast detaljdel
för valet enligt [renare spelgränssnitt](compact-interface.md). Det ersätter
informationen i varje trädruta. Research queue och detaljer kan visas samtidigt.
Detta kompletterar `forsknings-tradnavigation` och `forskningstradets-utrymme`.
Alla förkunskaper behöver vara klara för att nästa nivå ska identifieras;
grundtekniker, befintliga köposter och återfunna tekniker är också identifierade.

## Verifiering

Regressionstesterna för musdragning misslyckades först eftersom orderraden inte
rullade och klicket kunde skapa en order. Efter rättningen passerar dragning,
avbrott, vanligt klick och återställning av rullningsläge. Ett ytterligare
regressionstest skyddar att punktstjärnornas storleksskillnader finns kvar
även nära gränsen till nästa detaljnivå.

Enhetstester skyddar reproducerbar galax, varierade avstånd, nåbara planeter,
oförändrad inläsning av en sparad värld med 300 system, forskningsfronten och
inspektion utan beställning. Produktionsstatus verifieras för aktiva
transportkedjor över flera led, brutna och stängande rutter, byggnader, varor,
skepp, frakt, lokala och fjärranslutna köer samt färdigställande.

Riktade webbläsartester omfattar desktop Chromium, telefon Chromium och telefon
WebKit. Skärmbilder av närbild, galaxöversikt, forskningsdetaljer och Production
har granskats. Kontrast, små forskningsrutor, musdragning, native pinch,
tangentbord, fokus, mobilformat och större typsnitt ingår. Treårstestet har
90 sekunders tidsbudget för den befintliga seriella händelseannonseringen.
Snabbsvitens totala tidsgräns är fortsatt 20 sekunder. Sluttest och merge är
inte beställda.

De riktade webbläsarflödena omfattar 45 godkända scenarier och nio
plattformsberoende överhopp. Sju riktade utökade forskningskontroller passerade.
Snabbsviten med 537 tester tog 13,21 sekunder; därefter tillkom två godkända
regressioner för punktstjärnornas storlek. Den slutliga committade revisionen
kontrolleras åter av `deploy:quick` före publicering, inklusive hela snabbsviten
och de två korta mobilkontrollerna. Publiceringsrapporten sparas under
`dist/deployments/` enligt driftsättningsinstruktionen.
