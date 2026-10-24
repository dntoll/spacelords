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

Rocket engine factory, Ion pulse engine factory och Weapons module factory
producerar sina respektive delar. Colony ship förbrukar tre motorer,
Exploration ship två och Transport ship och Fighter en. Fighter förbrukar
även en Weapons module, utöver material och besättning. Minst en Ion pulse
engine ger skeppet +1 fart; flottans långsammaste skepp avgör farten.
Motorer blandas och monteras vid byggstart, med tillgänglig lokal Ion först.
Brist täcks av befintlig försörjning och lager före ny produktion, sorterat
efter kortast beräknad transporttid. Lokal transporttid är noll. Vid lika tid
väljs Ion före Rocket och därefter planetens stabila identifierare.
Reservationer för andra projekt skyddas. Överblivna motorer och redan beställd
produktion behålls; reservationer släpps när skeppet är färdigt. Delar lagras och transporteras som andra varor.
`automatiska-delorder`: lokalt lager, inkommande leveranser och tidigare
produktionsorder räknas av utan att använda samma del två gånger. För Weapons module: finns en
färdig lokal delfabrik köas återstående delar före huvudordern. Annars söks
tillgängliga lager genom aktiva handelsrutter, med kortast uppskattade
leveranstid först. För återstående brist används obokade delorder eller nya
order hos närmaste producent med rätt färdig fabrik. Fjärrorder läggs sist i
producentens Build queue. Lika leveranstid avgörs med planetens stabila
identifierare. Varje länk måste ha en tilldelad transportflotta som inte begärt
Release; stängande rutter räknas inte. En anslutningsresa till rutten räknas
in i väntetiden. Delproduktion kan vänta på råvaror eller personal.

Hela beställningen avvisas med en förklaring om någon del inte kan ordnas.
Inga delorder, reservationer eller lager ändras då. Detta ersätter den tidigare
regeln om att acceptera en Fighter utan möjlig delförsörjning, enligt
användarens ändring 2026-10-23. Motorreglerna ovan ersätter tidigare oförändrade skeppsrecept och lokal motorproduktions företräde, enligt ändringen 2026-10-24.
Om skeppet avbryts ligger delorder kvar för annan användning.

Om en fabrik rivs ligger planetens produktionsorder kvar. De kan använda en
annan motsvarande fabrik eller vänta tills den byggs igen; byggordern kan flyttas
före det blockerade projektet. Äldre sparade fabriksköer slås ihop utan att
inbördes ordning inom respektive gammal kö ändras.

## Research

Utvinning och Research station är tillgängliga från början. Rocket engine
factory är första fabrikstekniken. Exploration ship factory kräver den och
öppnar Colony ship factory samt Transport ship factory; den sista öppnar
Trade logistics. Weapons module factory kräver Rocket engine factory och
Fighter factory kräver Weapons module factory. Ion pulse engine factory är
en separat gren efter Rocket engine factory och krävs inte för skeppsfabrikerna.
Den kostar 16 Iron, 8 Water och 4 Oil och behöver 300 personal. Varje Ion pulse
engine kostar 6 Iron, 2 Water och 2 Oil.
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

Förstärkningsordern sparas, kan avbrytas på Star map eller i Fleets eller ersättas med en ny
destination. Om målet blir tomt eller försvinner stannar skeppen där de är och
blir ett nytt beslut. När en förstärkningsgrupp ansluter försvinner dess
tillfälliga flottkort; den ursprungliga avsändarflottan behålls även om den
blev tom. Tom mottagarflotta tar fortfarande emot direkt vid avsändarens position.

Ruttuppdrag, last och färdorder behålls när nya skepp ansluter. På Star map och
i Fleets visas båda ändplaneternas namn. Piratrån och eskortskydd är fortfarande
inte implementerade.

`skepp-ur-olastad-ruttflotta` — **Fullständigt implementerat**: skepp får lämna
en Trade fleet när hela flottans lastrum är tomt. Last blockerar alla
skeppstyper, även Fighter, oavsett återstående lastkapacitet. Väntande gods i
planetlager räknas inte som last på flottan. Flytt till annan flotta, fysisk
förstärkning på avstånd och New fleet följer samma regel. Rutten och färden
behålls så länge ett Transport ship återstår. När sista Transport ship lämnar
frigörs flottan direkt från rutten och en eventuell Release-begäran tas bort.
Kvarvarande skepp behåller position och färd; en helt tom flotta saknar position
och färdorder. En stängande rutt tas bort när dess sista flotta lämnat.
Tilldelning, last och frigörande bevaras vid sparning. Regeln ersätter den
tidigare spärren mot alla uttag ur aktiva ruttflottor.

Aktiva byggprojekt beställer saknade resurser automatiskt. Källplanetens egna
aktiva behov och tidigare reservationer skyddas. Äldsta behov behandlas först.
Tillgängliga källor jämförs efter uppskattad leveranstid, inklusive avstånd,
flottposition och pågående transporter. Uppskattningen kan ändras.

Material försvinner från källagret när det lastas och kommer till nästa lager
vid faktisk ankomst. Flera länkar kräver omlastning och en ny resa tidigast
nästa år. Transitmaterial är reserverat för slutmottagaren. Avbrutna order
släpper olastade reservationer; redan lastat material fortsätter till mottagaren
som vanligt lagermaterial. Om rutten stängs lossas pågående last vid dess nästa
ändplanet utan att försvinna. Vid Release lämnar en flotta tjänsten efter resa
och lossning. En olastad flotta vars sista Transport ship flyttas ut frigörs
direkt enligt `skepp-ur-olastad-ruttflotta`.

## Route, Production och försörjning

[Route och Production](route-production.md) visar försörjningen på kartan.
Route sammanfattar första projektet i Build queue med Needs attention, Waiting,
Ready eller Idle; Production kan följa varje köposts försörjningskedja. Material reserverat för utleverans eller omlastning räknas inte som
lokalt tillgängligt. Delvis täckta behov visas med kvarstående Unprovided.

Awaiting pickup skiljs från In transit. Leveranser visar källa, mottagare,
projekt och nästa anhalt. Uppskattningar bygger på aktuell transportkedja och
visas som okända om fortsatt transport saknas. En fabrik eller möjlig källa
räknas inte som en arrangerad leverans. Beställd delproduktion visas däremot
som Ordered production och ger Waiting när försörjningen fungerar. Delarna
blir Awaiting pickup först när de verkligen finns i lager. Reservationen
följer delarna genom transport, omlastning och väntan på förbrukning.
Star map administrerar fortsatt rutter; rutter utan aktiv transport visas
streckade enligt `streckade-rutter-utan-transporter`.

## Decisions

Tom forskningskö, tom gemensam planetkö, saknad fabrik, ledig flotta och
försörjningsproblem samlas i Decisions. Next decision och Review öppnar rätt
sammanhang. Normal väntan på lokal utvinning eller fungerande transport visas
som status. Skip this turn gäller ett år. End turn visar en samlad varning;
spelaren får alltid fortsätta med End turn anyway.
