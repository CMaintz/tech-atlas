---
title: Store sprogmodeller — hvad de er, hvordan de virker, og hvad de betyder for governance
term: ai/large-language-model
lang: da
---

## Hvad er det?

En **stor sprogmodel (LLM)** er en deep learning-model, der er trænet på meget store mængder tekst til at gøre én ting: forudsige det næste token (et ord eller en del af et ord) ud fra teksten indtil nu. Gentager man den ene forudsigelse tusindvis af gange i træk, får man afsnit, opsummeringer, oversættelser, kode og svar på spørgsmål. Chatassistenter, skrivehjælpere i kontorpakker og mange "AI-funktioner" i forretningssoftware er tynde lag oven på en LLM.

Idéen om statistiske sprogmodeller er gammel, men tre udviklinger gjorde den nuværende generation mulig:

- **Transformeren (2017).** Artiklen "Attention Is All You Need" introducerede en arkitektur, der kan se på alle dele af en lang tekst på én gang i stedet for at læse ord for ord. Den kan trænes effektivt på mange grafikprocessorer, hvilket gjorde langt større modeller praktisk mulige.
- **Skala (2018–2020).** Forskerne fandt ud af, at større modeller og mere tekst blev ved med at gøre modellerne bedre på en nogenlunde forudsigelig måde. GPT-3 (Brown m.fl., 2020, "Language Models are Few-Shot Learners") havde 175 milliarder vægte og kunne løse nye opgaver ud fra en håndfuld eksempler i prompten – uden gentræning.
- **Instruktionstræning og chat (2022).** Ekstra træning på eksempler på hjælpsomme svar plus feedback fra menneskelige bedømmere forvandlede rå tekstforudsigere til assistenter, der følger instruktioner. Da ChatGPT blev lanceret i november 2022, nåede LLM'er den brede offentlighed næsten fra den ene dag til den anden.

I dag tilbydes LLM'er som cloudtjenester fra store udbydere, som modeller med åbne vægte, som organisationer selv kan køre, og i stigende grad som komponenter inde i andre produkter.

## Hvordan virker det?

### Træning: at lære, hvordan tekst plejer at fortsætte

Under **fortræningen** læser modellen enorme tekstsamlinger – hjemmesider, bøger, kode, fora – og justerer milliarder af interne vægte, så dens gæt på det næste token bliver bedre. Intet i processen tjekker, om et udsagn er sandt; modellen lærer, hvordan tekst _plejer at se ud_. Bagefter former **finjustering** og feedbackbaseret træning dens adfærd: at svare høfligt, afvise tydeligt skadelige anmodninger og følge et format.

### Inferens: ét token ad gangen

Når du sender en **prompt**, deler modellen den op i tokens, beregner en sandsynlighed for hvert muligt næste token, vælger ét, føjer det til teksten og gentager. Den mængde tekst, den kan tage i betragtning på én gang, er dens **kontekstvindue** – fra nogle tusind til over en million tokens i nutidens modeller. Alt uden for vinduet, også tidligere samtaler, ser modellen simpelthen ikke, medmindre et system lægger det ind igen.

### Hvorfor den hallucinerer

Fordi modellen er optimeret til at skrive _sandsynlig_ tekst frem for _efterprøvet_ tekst, producerer den nogle gange flydende, selvsikre udsagn, der er forkerte: opdigtede kilder, forkerte tal, domme der ikke findes. Det kaldes **hallucination**, og det er en direkte følge af, hvordan modellen er bygget – ikke en fejl, der bliver rettet med næste opdatering. Teknikker som **retrieval-augmented generation (RAG)** gør det sjældnere og lettere at opdage, men fjerner det ikke.

### Hvad den ikke har

En LLM har ingen indbygget database med fakta, ingen viden om dagens dato, medmindre den får den oplyst, og ingen adskillelse mellem "instruktioner" og "data" – alt er tekst i det samme vindue. Det sidste er roden til **prompt injection**.

## Hvad betyder det for en organisation og en koordinator?

LLM'er kommer ind i organisationer fra to sider: officielt gennem en licenseret assistent eller en funktion i eksisterende software og uofficielt, når medarbejdere indsætter arbejdsmateriale i en gratis chattjeneste (**shadow AI**). Governance-spørgsmålene er stort set de samme:

- **Data.** Hvad sker der med den tekst, man sender? Bliver den gemt, brugt til videre træning, behandlet uden for EU? For persondata er det et GDPR-spørgsmål, og udbyderen er typisk **databehandler**, hvilket kræver en **databehandleraftale**.
- **Korrekthed.** Hvem tjekker output, før det bruges i en afgørelse, et brev til en borger eller en kontrakt?
- **Adgang.** Hvis assistenten kan læse postkasser, filer eller systemer, arver den alle de adgangsproblemer, de systemer har – og lægger prompt injection oveni.
- **Regulering.** **EU's AI-forordning** pålægger udbydere af AI-modeller til almen brug forpligtelser og, afhængigt af anvendelsen, også de organisationer, der tager dem i brug. Forordningen tilskynder desuden organisationer til at understøtte AI-kompetencer, så medarbejdere, der arbejder med AI, forstår dens styrker og begrænsninger.

### Et gennemregnet eksempel

Freja er GRC-studerende i praktik hos en dansk boligforening. Medarbejderne er begyndt at bruge en chatassistent bygget på en LLM til at skrive udkast til mails til lejere og opsummere bestyrelsesreferater – præcis den situation, begrebets korte definition beskriver. Hendes leder beder hende skrive en retningslinje for brugen.

Hun starter med en enkel dataklassifikation: offentlig information (offentliggjorte regler, generelle meddelelser) må bruges frit; intern information (referater uden persondata) kun i virksomhedens licenserede assistent, hvor kontrakten udelukker træning på kundedata; fortrolige data og persondata (klager fra lejere, restancer, helbredsoplysninger) slet ikke uden en konkret vurdering. Hun tjekker, at udbyderen har en databehandleraftale og oplyser, hvor data behandles. Hun tilføjer to regler for output: Et menneske læser altid og står inde for den endelige tekst, og tal eller juridiske udsagn tjekkes mod kilden. Til sidst registrerer hun assistenten som et aktiv i risikoregistret med hallucination og datalæk som navngivne risici og foreslår en kort awareness-session, så medarbejderne forstår, _hvorfor_ reglerne findes.

## Typiske misforståelser

- **"Den slår ting op."** En ren LLM søger ikke i noget; den genererer tekst ud fra mønstre fra træningen. Kun systemer, der tilføjer søgning eller RAG, bruger kilder.
- **"Hvis den lyder sikker, har den nok ret."** En selvsikker tone siger intet om korrekthed. Hallucinationer er ofte de mest flydende sætninger i et svar.
- **"Den lærer af vores samtale."** Modellens vægte ændrer sig ikke, mens man chatter. Om dit input bliver _gemt_ og _senere brugt_ til træning, afhænger af udbyderen og kontrakten – og det er netop derfor, det skal tjekkes.
- **"Det er bare autofuldførelse, så det er ufarligt."** Mekanismen er enkel, men koblet til mail, filer eller værktøjer kan en LLM udføre handlinger med reelle konsekvenser.
- **"AI-forordningen forbyder ChatGPT-lignende værktøjer."** Det gør den ikke. Den regulerer anvendelser efter risikoniveau og pålægger udbydere krav om åbenhed og dokumentation; det meste almindelige kontorbrug er ikke højrisiko.
