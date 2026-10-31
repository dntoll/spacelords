# Upgrade för flottor

## Order och utrustning

`flottorder-upgrade` — **Fullständigt implementerat**.

Upgrade finns i Orders från flottvyn på Star map och Fleets när minst ett
skepp har utrustning som kan förbättras med färdig forskning. Alla
skeppstyper kan byta Rocket engines mot Ion pulse engines. Exploration
ships kan dessutom byta teleskop till högsta utforskade nivå. Redan bättre
utrustning behålls, även återfunna delar vars forskning ännu saknas.
Skeppens identiteter, typer och besättningar bevaras.

Ordern omfattar flottans aktuella skepp och forskning vid beställningen.
Varje äldre motor ersätts med en Ion pulse engine och varje äldre teleskop
med ett teleskop av måltypen. Befintlig fartregel gäller: minst en Ion pulse
engine ger +1 fart; flottan följer sitt långsammaste skepp.

Flottan reser fysiskt till närmaste egna färdiga, fungerande Orbital shipyard
som kan få fram delarna. Närhet är kortaste kända farbara resväg; lika
avstånd avgörs stabilt mellan varven. Varvet behöver ingen separat
skeppsfabrik för den besökande skeppstypen. Saknas lämpligt varv nekas ordern
med en förklaring, utan nya reservationer eller ändrad tidigare order.

Hela flottans planerade uppgradering genomförs vid årets avräkning när den
är vid varvet, planeten kan bemanna sina byggnader och alla delar finns i
planetens lager. Ingen pirat får finnas vid stationen. Ett nybyggt varv kan
användas från nästa år. Skeppen står kvar i samma flotta vid stationen.
Delarna förbrukas en gång; demonterade delar återgår till planetens lager.
Inget nytt skrov eller ny besättning betalas. Slutförandet ingår i planetens
gemensamma årsbesked. Själva ankomsten avslutar inte ordern och ger inget
separat ankomstbesked.

## Försörjning och väntan

`automatisk-uppgraderingsforsorjning` — **Fullständigt implementerat**.

Varvets planet beställer alla saknade delar direkt när ordern ges. Lokalt
lager, anslutna leverantörer och färdiga komponentfabriker används genom
befintliga regler för produktion och Trade routes. Saknade delar får
produktionsorder hos leverantören. Råvaror och färdiga delar måste faktiskt
utvinnas, tillverkas och fraktas; Upgrade skapar inga fria material och
ersätter inte Ion pulse engines med Rocket engines. Reservationer delas med
övrig produktion så att samma lager inte lovas åt flera beställningar.

Flottans status visar resan eller väntan på delar och personal. En aktiv
Upgrade ger inget vanligt beslut om ledig flotta. Om varvet förstörs eller
rivs söker ordern ett nytt lämpligt varv och ordnar dess försörjning. Saknas
ersättning väntar flottan med ett åtgärdsbeslut; ordern försvinner inte.
Avbruten delproduktion och verkliga transporthinder visas som problem som
behöver åtgärdas, i stället för att beskrivas som ordnad försörjning.

Cancel Upgrade eller en ersättande flottorder avbryter uppgraderingen och
frigör reservationer. Automatiska komponentbyggen som ordern skapade och som
ännu inte utförts tas bort. Redan tillverkade delar och last i rörelse
bevaras. Skepp flyttas mellan flottor först efter Cancel Upgrade.
Ruttflottor måste lämna Route före den manuella ordern, och bogserade vrak
måste först levereras eller släppas. Civilian transport måste avsluta en
pågående passagerarleverans. Ordinarie låsning under simulering gäller.

## Sparning

`spara-flottuppgradering` — **Fullständigt implementerat**.

Resmål, berörda skepp, målutrustning, leveranser, beställd tillverkning och
väntestatus bevaras vid omladdning. En omladdning upprepar inte förbrukning
eller installation. Förlust av berörda skepp tar bort deras behov; om inget
av dem finns kvar avslutas ordern. Äldre sparningar kan läsas utan rensning.

Ändring 2026-10-31: dessa krav ersätter begränsningen att befintliga skepp
inte kan uppgraderas under `automatisk-motormontering` och
`teleskop-i-exploration-ships`. Ordinarie nyproduktion, motorbonus,
teleskopräckvidder och varvens reparationsköer behåller sina regler.

## Stridsuppgraderingar

`utforskade-stridsuppgraderingar` — **Fullständigt implementerat**.

Missiles kräver Fighter factory. Armor kräver Weapons module factory.
Armored Fighter kräver Armor och Fighter factory. Armored Transport kräver
Armor och Transport ship factory. Armor ensamt ger inget skrov.

Upgrade i Orders monterar färdig forskning vid samma varvsbesök som motorer
och teleskop. En Fighter med noll salvor får två. En Fighter blir Armored
Fighter, skrov 5. En Transport ship blir Armored Transport, skrov 9. Identitet,
typ, last, besättning, storlek och fart behålls. Inga extra komponenter
förbrukas. En Fighter som redan har salvor, inklusive äldre sparade skepp utan
fältet, får inte nya missiler. Redan pansrade skepp behåller skrovet.
