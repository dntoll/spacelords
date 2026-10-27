# Mobilens kartval och forskning

Förtydliganden 2026-10-27. Befintliga sparade spel bevaras.

- `kartpanel-till-events` — **Fullständigt implementerat**: Detaljpanelen för
  vald flotta, planet, hex eller handelsrutt använder ytan ned till Events med
  en liten marginal. På mobil får den vanliga kartpanelen motsvarande extra
  höjd. Innehållet går fortsatt att rulla och End turn har egen plats.
  Detta kompletterar `rullningsbar-kartpanel` och `gemensam-events-panel` och
  ersätter det tidigare tomma avståndet för en separat kartlogg.
- `centrerat-kartfokus` — **Fullständigt implementerat**: Show placerar den
  berörda planeten eller flottan mitt i kartytan som återstår bredvid eller
  ovanför detaljpanelen. Production håller även byggvalen synliga; om de inte
  ryms runt mittpunkten justeras placeringen så att de kan nås. Befintlig zoom
  behålls. Hemvyn visar den markerade planeten fritt från detaljpanelen, så att
  spelaren kan dra en handelsrutt enligt `handelsrutt-skapande-pa-stjarnkartan`.
- `dubbelklick-koar-forskning` — **Fullständigt implementerat**: Dubbelklick
  eller dubbeltryck på en identifierad research-ruta köar tekniken och dess
  saknade förkunskaper en gång. Ett enkelt tryck öppnar fortsatt detaljer och
  den separata Research-knappen finns kvar. Anonym, färdig eller redan köad
  research beställs inte igen. Kraven på Research station och planning gäller
  även för dubbelklick. Detta utökar `forskningsdetaljer-vid-val` och ersätter
  begränsningen att enbart den separata Research-knappen kan köa forskning.
