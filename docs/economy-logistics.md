# Ekonomi, logistik och beslut

Planeter har ändliga fyndigheter av Iron, Water och Oil. Iron mine,
Water extractor och Oil extractor flyttar material till planetens obegränsade
lager. Bemanning krävs; nya byggnader arbetar från nästa år. Material som inte
används ligger kvar. Hemvärlden börjar med material för att starta ekonomin;
nya kolonier behöver försörjning eller senare lokal utvinning.

Byggnader, delar och skepp delar en enda Build queue per planet, utan fast
kögräns. Högst ett köprojekt blir klart per planet och år. Färdiga fabriker
avgör vilka produkter som kan beställas; de har inga egna köer. Material betalas
en gång vid faktisk byggstart. Brist på material, delar, fabrik eller personal
stoppar förstaprojektet. Kön kan omordnas eller projekt avbrytas.

Rocket engine factory och Weapons module factory tillverkar Rocket engine
respektive Weapons module. En Fighter förbrukar en av varje, förutom sitt
material och sin besättning. Delar lagras och transporteras som andra varor.
Om lokala färdiga delfabriker finns läggs saknade delar automatiskt före en ny
Fighter-order. Befintligt lager, inkommande leveranser och tidigare
produktionsorder räknas av. Utan lokal delfabrik väntar skeppet på leverans
eller manuellt ordnad delproduktion. Övriga skeppsrecept är oförändrade.
Om skeppet avbryts ligger delorder kvar för annan användning.

Om en fabrik rivs ligger planetens produktionsorder kvar. De kan använda en
annan motsvarande fabrik eller vänta tills den byggs igen; byggordern kan flyttas
före det blockerade projektet. Äldre sparade fabriksköer slås ihop utan att
inbördes ordning inom respektive gammal kö ändras.

## Research

Utvinning och Research station är tillgängliga från början. Exploration ship
factory är första fabrikstekniken och öppnar forskning för Colony ship factory
och Transport ship factory. Den sista öppnar Trade logistics. Rocket engine
factory kräver Exploration ship factory, Weapons module factory kräver Rocket
engine factory och Fighter factory kräver Weapons module factory.
Val av en senare teknik köar även saknade förkunskaper. Köer kan redigeras,
men förkunskaper måste komma först. Högst en teknik slutförs per år.

## Trade routes

En rutt länkar exakt två ägda planeter. Flera lediga flottor kan tilldelas samma
rutt från valfri position. Transport ships ger lastkapacitet; övriga skepp
följer med flottan. Ingen pirat- eller eskortskyddsmekanik ingår ännu.

`ruttflotta-till-narmaste-andplanet` — **Fullständigt implementerat**:
en tilldelad flotta utanför rutten reser först till den närmaste ändplaneten,
mätt i hexavstånd. Vid lika avstånd väljs ruttens första ändplanet, oberoende
av planetlistans ordning. Uppdraget tilldelas direkt men flottan behåller sin
verkliga position och förflyttas med sin vanliga fart under kommande år.
Anslutningsresan sker även utan väntande frakt och går klart innan flottan
hämtar material. Vid ankomst börjar vanlig ruttrafik. En flotta vid en
ändplanet får ingen extra anslutningsresa. Resan och ruttuppdraget sparas.
Frigörande och stängning under anslutningsresan följer befintliga regler:
flottan når destinationen innan den lämnar uppdraget. Regeln ersätter kravet
att flottan måste stå vid en ändplanet vid tilldelning, i båda vyerna.
Krav på transportskepp och position samt spärr mot pågående resa,
förstärkningsuppdrag, annat ruttuppdrag och stängande rutter behålls.

En ruttflotta kan förstärkas med skepp från en vanlig flotta. På samma hex sker
anslutningen direkt. På avstånd reser skeppen som en egen grupp med status
En route och följer målflottans rörelser tills de möts på samma hex. Detta gäller
också vanliga mottagarflottor. Avstånd och fart gäller även under förföljelsen;
en långsammare grupp kan behöva att målflottan stannar för att hinna ikapp.
Anslutningen ger inga extra förflyttningssteg under året.

Förstärkningsordern sparas, kan avbrytas i Fleets eller ersättas med en ny
destination. Om målet blir tomt eller försvinner stannar skeppen där de är och
blir ett nytt beslut. När en förstärkningsgrupp ansluter försvinner dess
tillfälliga flottkort; den ursprungliga avsändarflottan behålls även om den
blev tom. Tom mottagarflotta tar fortfarande emot direkt vid avsändarens position.

Ruttuppdrag, last och färdorder behålls när nya skepp ansluter. För att ta skepp
ur ruttflottan behöver den först lämna rutten. I Fleets visas båda
ändplaneternas namn. Piratrån och eskortskydd är fortfarande inte implementerade.

Aktiva byggprojekt beställer saknade resurser automatiskt. Källplanetens egna
aktiva behov och tidigare reservationer skyddas. Äldsta behov behandlas först.
Tillgängliga källor jämförs efter uppskattad leveranstid, inklusive avstånd,
flottposition och pågående transporter. Uppskattningen kan ändras.

Material försvinner från källagret när det lastas och kommer till nästa lager
vid faktisk ankomst. Flera länkar kräver omlastning och en ny resa tidigast
nästa år. Transitmaterial är reserverat för slutmottagaren. Avbrutna order
släpper olastade reservationer; redan lastat material fortsätter till mottagaren
som vanligt lagermaterial. Om rutten stängs lossas pågående last vid dess nästa
ändplanet utan att försvinna. En flotta lämnar tjänsten efter resa och lossning.

## Decisions

Tom forskningskö, tom gemensam planetkö, saknad fabrik, ledig flotta och
försörjningsproblem samlas i Decisions. Next decision och Review öppnar rätt
sammanhang. Normal väntan på lokal utvinning eller fungerande transport visas
som status. Skip this turn gäller ett år. End turn visar en samlad varning;
spelaren får alltid fortsätta med End turn anyway.
