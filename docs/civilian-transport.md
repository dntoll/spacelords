# Civilian transport

Samtliga krav nedan är **Fullständigt implementerat**.

## Forskning och tillverkning

`civil-skyttelforskning`: Civilian transport följer Trade logistics och kostar
ett forskningspoäng enligt vanliga forskningsregler. Transport ship factory
kan därefter även bygga Civilian shuttle; ingen extra fabrik behövs.

`civil-skytteltillverkning`: en skyttel kostar 4 Iron, 2 Water, 1 Oil,
en motor och 50 besättning. Farten är 2; Ion pulse engine ger vanliga +1.
Kapaciteten är 500 passagerare per skyttel i flottan. Varje nybygge får en
separat flotta med aktiv Civilian transport. Befintliga flottor behåller sina
order. Spelaren kan omgruppera olastade skyttlar och låta Fighters följa med.

## Arbetskraft och bokning

`automatisk-arbetskraftstrafik`: personalbehovet omfattar färdiga byggnader
som inte ska rivas och personal samt besättning för första posten i Build
queue. Senare poster räknas inte. Förstaposten räknas även vid materialbrist.
Utflyttning lämnar minst det större av 1 000 personer och personalbehovet.
Inflyttning begränsas av personalbrist och befolkningskapacitet. Bokningar
hindrar flera flottor från att reservera samma utflyttare eller arbetstillfällen.

Befolkning dras av vid ombordstigning och tillförs vid avstigning. Passagerare
ombord ger ingen planetär befolkningstillväxt. Besättningen är skild från
passagerarna och dras av vid tillverkning enligt befintliga regler.

## Resor och avbrott

`civiltrafik-pa-handelsnatet`: varje öppet ruttled kan användas, utan krav på
Transport ship. Skyttlar ger ingen godskapacitet och kan inte bära varor.
Uppdraget med kortast beräknade tid till leverans väljs, inklusive tomresan
till avreseplaneten. Lika resultat avgörs med stabila identifierare.

Flottan passerar varje ändplanet med vanlig flottfart och hexnavigation.
Passagerarna behåller sin skyttel vid mellanlandningar. Nästa ruttled börjar
tidigast nästa år. Vid varje mellanlandning omprövas behovet: befintlig
mottagare behålls om behovet täcker hela lasten, annars söks närmaste nåbara
arbetskraftsbrist på nytt.
Vid delvis täckt behov levereras det antal som behövs; övriga söker nytt mål.
Saknas jobb återvänder passagerarna till avreseplaneten, eller till närmaste
nåbara koloni med plats om hemplaneten är full. Saknas plats stannar de ombord.

Utan uppdrag väntar flottan och söker igen nästa år. Utanför ruttens ändplaneter
krävs manuell förflyttning till en ändplanet innan automatiken kan fortsätta.
Stop stoppar nya hämtningar och avslutas efter avstigning. Lastade flottor får
inte delas eller ges konkurrerande order. Civilian transport kan aktiveras igen.
En stängande rutt tillåter redan påbörjat ruttled men inga nya resor. Pirater
förstör civila skyttlar och ombordvarande passagerare enligt vanliga stridsregler.

## Sparning och gränssnitt

`civiltrafik-sparning`: bokningar, passagerare, aktuell destination och
trafikorder bevaras mellan år och vid sparbara upptäckts- och stridsavbrott.
Äldre spel får noll skyttlar och inga nya order. Inga sparplatser rensas.
Flottkort visar Civilian transport, passagerarantal, mål och väntorsak.
Skeppets bild återanvänder Transport ship med egen Civilian shuttle-etikett.

Ändring 2026-10-30: nybyggda skyttlars egna automatiska flottor ersätter
mottagarvalet för just Civilian shuttle i `skepp-till-destinationsflotta`.
Övriga nybyggen följer `nybyggda-skepp-utan-ruttflotta`.

## Verifiering av automatiken

Uppföljning 2026-10-31: `automatisk-arbetskraftstrafik`,
`civiltrafik-pa-handelsnatet` och `civiltrafik-sparning` verifieras även
med ett sammanhängande speltest där en nybyggd Civilian shuttle hämtar
passagerare, färdas och lämnar dem vid personalbrist. Spelet laddas om
mellan åren och rutten saknar Transport ship. Testet passerar utan ändring
av civiltrafikens regler. Detta visar att kedjan fungerar för testfallet;
det fastställer inte varför en viss färja väntar i spelarens sparning.
