# Handelsgraf

Trade routes ersätter den tidigare formulär- och listvyn med ett spelbräde.
Forskningskrav, ruttkapacitet, fysisk frakt och regler för flottornas
tilldelning och frigörande behålls.

| Kravnamn                     | Status                     | Beskrivning                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handelsgraf`                | Fullständigt implementerat | Ägda planeter är noder med samma inbördes riktning och avstånd som på Star map. Två valda planeter kan kopplas ihop; länkar visar befintliga rutter, kapacitet och tilldelade flottor.                                                            |
| `handelsgraf-planetoversikt` | Fullständigt implementerat | Planetkort visar materiallager, utvinning per år, inkommande leveranser, kvarvarande materialbehov för nästa projekt och vad fabrikerna kan producera.                                                                                            |
| `handelsgraf-flottboxar`     | Fullständigt implementerat | Flottor visas med skeppsbilder och antal i samma stil som Fleets. Position, resa, last och uppdrag framgår. En giltig flotta kan tilldelas med Assign eller dras till länken. Frigörande följer befintliga regler för pågående resa och lossning. |
| `handelsgraf-navigation`     | Fullständigt implementerat | Spelaren kan panorera, zooma och återgå till en översikt med mus, touch och tangentbord. Läget behålls när rutter eller flottilldelningar ändras.                                                                                                 |

Need visar det som saknas för det första köprojektet efter avdrag för lokalt
lager och inkommande leveranser. +/yr visar faktisk resursutvinning. Factories
visar vad tillgängliga fabriker kan tillverka; det är inte en utfästelse om
löpande tillverkning. Next visar det första projektet i Build queue.
