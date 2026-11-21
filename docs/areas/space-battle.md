# Rymdstrid

Taktisk rymdstrid utkämpas på en egen karta när flottor möts. Spelaren ger
order till skeppen, och striden kan också testas fristående från
`Saved games`. Detaljerna står i
[taktisk strid](../space-battle/tactical-combat.md).

## Krav

- **Strid som spelgränssnitt:** `fullskarms-stridskarta`,
  `skeppsnara-stridskontroller`, `vapensymboler-i-strid`,
  `avfyra-pa-markerat-mal` och `begransad-stridskamera` är
  **Fullständigt implementerat**. Hexkartan fyller skärmen med en liten HUD,
  rörelse och End ship turn runt skeppet samt vapen som symbolknappar.
  Ett nytt mål markeras; tryck på ett markerat mål avfyrar vapnet.
  Drag och nypzoom begränsas vid kartans kanter. Det går att zooma ut tills
  hela kartan ryms; minst en riktning fyller skärmen och överbliven rymd
  centreras i den andra. Test battle har asteroider.
  Detta ersätter orderpanelerna och Fire weapon-knappen.
  Se [taktisk strid](../space-battle/tactical-combat.md).

- **Autoaim och stora stridsskepp:** `autoaim-med-manuellt-mal` och
  `stora-skepp-over-flera-hex` är **Fullständigt implementerat**. Autoaim
  väljer närmaste träffbara fiende i främre eldbågen och prioriterar rakt
  framför vid lika avstånd. Spelarens giltiga målval behålls. Transport ship
  och Colony ship upptar tre hex med verklig kollision, träffyta och skydd.
  `fuskknapp-for-teststrid` omfattar nu utplacering och båda stora typerna.
  Äldre pågående strider behåller sin tidigare geometri utan rensning.
  Se [taktisk strid](../space-battle/tactical-combat.md).

- **Stridsfeedback och snabbtest:** `synligt-stridsresultat`, `synligt-stridsslut`,
  `automatiskt-skeppsval-i-strid`, `synliga-fiendemanovrer` och
  `fuskknapp-for-teststrid` är **Fullständigt implementerat**. Träff, miss och
  skada visas på kartan, egna skepp väljs automatiskt och fienden visar varje
  manöver. Huvudmenyn har Test battle utan påverkan på sparplatserna.
  `stridsrapport-i-dialog` är **Fullständigt implementerat** med ändrat beteende:
  slutresultatet visas på stridskartan, året fortsätter utan rapportdialog och
  rapporten finns i Events. Se [taktisk strid](../space-battle/tactical-combat.md).

- **Direkta stridsorder:** `skeppsval-startar-stridstur` och
  `stridsorder-utan-mobilscroll` är **Fullständigt implementerat**. Val av ett
  spelbart skepp startar dess tur direkt. Rörelse och End ship turn finns
  runt skeppet; vapenval ligger i skärmens nederkant. Tryck på det markerade
  målet avfyrar. Logg och regler finns under Combat details.
  Se [taktisk strid](../space-battle/tactical-combat.md).

- **Skeppens riktning i strid:** `skeppets-framat-foljer-spriten` är
  **Fullständigt implementerat**. Skeppsbildens nos, framåtmarkering,
  framåtförflyttning och eldbåge följer samma riktning i alla sex lägen.
  Se [taktisk strid](../space-battle/tactical-combat.md).

- **Stridsuppgraderingar:** `utforskade-stridsuppgraderingar`,
  `missilernas-omradeseffekt` och `traffhex-istallet-for-mallista` är
  **Fullständigt implementerat**. Missiles, Armor, Armored Transport och
  Armored Fighter forskas fram och monteras med Upgrade. En Fighter bär två
  missilsalvor. Missiler träffar vald hex och alla grannhexar, även egna skepp.
  Skott siktas på stridskartan. Äldre sparade Fighters behåller sina salvor.
  Se [taktisk strid](../space-battle/tactical-combat.md) och
  [flottuppgradering](../fleet-upgrades.md).

- **Taktisk strid:** Ny separat hexkarta med alla deltagande skepp,
  utplacering, växelvisa aktiveringar, eldbågar, skydd, öppna D6-slag och
  skeppsvis reträtt är **Fullständigt implementerat**. Sparade strider
  återupptas utan nya tärningsslag och äldre spel bevaras. Detta ersätter den fasta
  förlustformeln i `flottstrid-per-hex`. Se [taktisk strid](../space-battle/tactical-combat.md).

- **Manöver, vrak och krock:** `manoverpoang-och-hastighet`,
  `svang-vid-hastighet`, `avslutad-manoveranimation`,
  `krock-med-skepp-och-asteroid`, `motor-utslagen-vrak`,
  `skrovslut-vrak-eller-splitter`, `vrak-blockerar-och-sprangs`,
  `vrak-beskjutning-sista-utvag`, `nasta-skepp-vid-slut-pa-handlingar`,
  `flykt-mot-escape-zon`,
  `ingen-avslut-med-fart-och-manoverpoang`, `skott-mellan-manoverpoang` och
  `beskjut-asteroid` är **Fullständigt implementerat**.
  Nya strider har hastighet och manöverpoäng, vidare sväng i högre fart, krock
  med skepp och asteroider, samt vrak som ligger kvar. End ship turn kan inte väljas när
  skeppet har både fart och manöverpoäng kvar. Ett skott mellan två
  manöverpoäng kräver att den andra också används. En beskjutning spränger en
  asteroid. Manöverpresentationen avslutas även om webbläsaren tappar en
  animationsbildruta, så skeppet visas på sin verkliga slutposition och nästa
  order kan ges. Sprängda skepp lämnar inget
  bärgningsvrak. Obeväpnade skepp flyr mot `Escape`. Äldre pågående strider
  behåller den tidigare rörelsen. Se [taktisk strid](../space-battle/tactical-combat.md).

- **Nya stridsorder:** `hexmal-for-manover` och `overwatch-i-rymdstrid` är
  **Fullständigt implementerat**. Kartan visar valbara manövrer och
  förhandsvisning. Overwatch reserverar ett vapen och avfyras mot den första
  fiende som blir skjutbar under rörelse.
  `skuggad-manovervag`, `manoverval-vid-hexkant`,
  `animerad-skeppsforflyttning` och `ingen-hpsiffra-pa-stridskartan` är
  **Fullständigt implementerat**: den valda färden visas med skuggade skepp,
  riktningsval ligger vid motsvarande hexkant och skeppet rör sig animerat.
  HP visas med stapel utan siffra under skeppet.
  Kartvalen ersätter fart- och riktningsknapparna i nya strider. Se
  [produktkraven](../product-requirements.md).
