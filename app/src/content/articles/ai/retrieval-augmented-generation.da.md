---
title: Retrieval-augmented generation — når sprogmodellen svarer ud fra jeres egne dokumenter
term: ai/retrieval-augmented-generation
lang: da
---

## Hvad er det?

**Retrieval-augmented generation (RAG)** er en måde at bygge AI-assistenter på, hvor et søgetrin først finder afsnit, der er relevante for et spørgsmål, i en udvalgt samling dokumenter, hvorefter en **stor sprogmodel (LLM)** skriver sit svar ud fra de afsnit. I stedet for at svare ud fra det, modellen tilfældigvis opsugede under træningen, svarer den ud fra materiale, I selv leverer – som en studerende til en eksamen med alle hjælpemidler.

Begrebet stammer fra en artikel fra 2020 af Patrick Lewis og kolleger hos Facebook AI Research, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", som kombinerede en søgekomponent med en tekstgenerator og viste bedre resultater på spørgsmålsbesvarelse end hver af dem alene. Idéen tog fart efter 2022, da organisationer ønskede chatassistenter, der kendte _deres_ politikker, produkter og sager. RAG viste sig at være langt billigere og mere fleksibelt end at gentræne en model, hver gang et dokument ændrede sig, og det er blevet standarddesignet for interne "chat med jeres dokumenter"-værktøjer.

## Hvordan virker det?

### Forberedelse af dokumenterne

Før der stilles spørgsmål, bliver dokumentsamlingen forberedt:

1. **Indsaml** kilderne – et intranet, et politikbibliotek, et sagssystem, et SharePoint-site.
2. **Opdel** hvert dokument i bidder på nogle hundrede ord, så en søgning kan returnere netop den relevante del.
3. **Lav embeddings** af hver bid: En **embedding**-model omdanner teksten til en lang række tal, der fanger dens betydning, så tekster om beslægtede emner ender tæt på hinanden.
4. **Gem** embeddings i en vektordatabase eller et søgeindeks sammen med en henvisning til det oprindelige dokument og – vigtigt – hvem der må se det.

### Besvarelse af et spørgsmål

1. Brugerens spørgsmål omdannes til en embedding på samme måde.
2. Systemet henter de bidder, hvis embeddings ligger tættest på spørgsmålet, ofte kombineret med almindelig søgning på nøgleord.
3. De bedste bidder lægges ind i **prompten** sammen med en instruktion som "Svar kun ud fra kilderne nedenfor, og henvis til dem."
4. Sprogmodellen skriver svaret, helst med links til de kilder, den brugte.

### Hvorfor det hjælper – og hvor det ikke gør

RAG holder svarene **opdaterede** (opdater et dokument, og næste svar afspejler det), gør dem **efterprøvelige** (brugeren kan klikke sig videre til kilden) og mindsker **hallucination**, fordi modellen har de rigtige fakta foran sig. Men det fjerner ikke hallucination: Modellen kan stadig læse et afsnit forkert, kombinere to kilder forkert eller udfylde huller, når søgningen intet brugbart finder. Og svaret kan kun blive så godt som dokumenterne – en forældet politik, der citeres med stor sikkerhed, er stadig forældet.

### RAG over for finjustering

Det vigtigste alternativ til at tilpasse en model til en organisation er **finjustering**, hvor modellen får ekstra træning på jeres egne eksempler. Finjustering er god til at ændre, _hvordan_ en model skriver – tone, format, fagsprog – men den bager viden ind i modellen, hvor den er svær at opdatere, svær at begrænse per bruger og næsten umulig at slette. RAG holder viden _uden for_ modellen, hvor almindelig adgangsstyring og sletning virker. Mange systemer i praksis bruger begge dele.

## Hvad betyder det for en organisation og en koordinator?

RAG gør en AI-assistent til en ny vej ind til jeres dokumenter. Det gør det lige så meget til et spørgsmål om adgangsstyring som om AI:

- **Rettigheder skal følge brugeren.** Søgetrinnet må kun returnere bidder, som den spørgende bruger har lov til at se. Hvis indekset er bygget med en servicekonto, der kan læse alt, bliver assistenten et værktøj til at omgå adgangsrettigheder.
- **Skidt ind, skidt ud.** Gamle udkast, dubletter og forældede politikker bliver fundet og citeret. Dokumenthygiejne bliver et spørgsmål om AI-kvalitet.
- **Upålideligt indhold.** Dokumenter udefra – kundemails, leverandørfiler, hjemmesider – kan indeholde **prompt injection**. Hentet tekst skal behandles som data, ikke som instruktioner.
- **Persondata.** Indekset er en kopi af jeres dokumenter. Det skal være omfattet af slettefrister og de registreredes rettigheder efter GDPR; det er ikke nok at slette originalen, hvis bidden stadig ligger i indekset.

### Et gennemregnet eksempel

Ida er GRC-studerende i en dansk ingeniørvirksomhed med 400 ansatte. IT har bygget en intern hjælpebot, der besvarer spørgsmål som "hvor mange feriedage har jeg?" ved at finde den gældende HR-politik, citere den og linke til kilden – eksemplet fra begrebets definition. Det fungerer godt i piloten, og IT vil gerne tilføje hele HR-drevet.

Ida stiller tre spørgsmål. For det første: **Hvem kan se hvad?** HR-drevet indeholder lønsamtaler og sygefravær. Hun tjekker og finder ud af, at indekset er bygget med en servicekonto; en testmedarbejder, der spørger "hvad tjente min kollega sidste år?", får et svar med citat. Udrulningen sættes på pause, indtil søgetrinnet filtrerer efter brugerens egne rettigheder. For det andet: **Hvilken version er gældende?** Drevet rummer tre versioner af feriepolitikken; hun foreslår kun at indeksere det offentliggjorte politikbibliotek. For det tredje: **Hvordan håndteres sletning?** Hun tilføjer indekset til fortegnelsen over behandlingsaktiviteter og sikrer, at når et dokument slettes eller dets opbevaringsperiode udløber, bliver dets bidder også fjernet. Botten går i luften en måned senere med færre kilder og en tydelig ejer.

## Typiske misforståelser

- **"Med RAG kan AI'en ikke finde på noget."** Det gør opdigtede svar sjældnere og lettere at opdage; det fjerner dem ikke. Bevar kildelinks, og lær brugerne at klikke på dem.
- **"Modellen lærer vores dokumenter."** Ved RAG ændrer modellens vægte sig ikke. Dokumenterne ligger i et indeks og slås op hver gang – og netop derfor kan de opdateres og begrænses.
- **"Sikkerheden er i orden, fordi dokumenterne er interne."** Internt betyder ikke, at alle må se alt. Assistenten skal respektere de samme adgangsregler som filsystemet.
- **"Flere dokumenter giver bedre svar."** At tilføje alt gør ofte svarene dårligere, fordi forældede eller irrelevante afsnit fortrænger de rigtige.
- **"RAG og finjustering er konkurrenter – vælg én."** De løser forskellige problemer – viden over for adfærd – og kombineres ofte.
