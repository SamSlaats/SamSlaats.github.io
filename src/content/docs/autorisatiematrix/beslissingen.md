---
title: Beslissingen
description: Keuzes over de werkwijze en opbouw van de autorisatiematrix, met de afweging erachter.
sidebar:
  order: 4
---

Elke keuze volgens hetzelfde stramien: context, opties, keuze, gevolgen.
Het sjabloon staat in `sjablonen/beslissing.md`. De functionele ontwerpkeuzes (het model,
het gedrag, Entra en AD) staan in
[docs/ontwerp.md](https://github.com/SamSlaats/autorisatiematrix/blob/main/docs/ontwerp.md)
in de repo van het project.

## 1. Ontwikkelen in WSL2, Docker pas bij het uitrollen

**Context**
Op mijn Windows-pc staat Smart App Control aan. Dat blokkeert test-DLL's die ik zelf lokaal
bouw. Het oorspronkelijke plan was om tests daarom alleen in GitHub Actions te draaien. Maar
het domein en de vergelijkingslogica bouw ik test-first (TDD), en dan wacht ik bij elke stap
een paar minuten op de pipeline. Die feedbacklus is te traag om zo te werken.

**Opties**
- *Tests alleen in GitHub Actions.* Geen extra installatie, maar elke testronde kost minuten.
- *WSL2 met Ubuntu.* Een echte Linux-omgeving naast Windows. Linux-programma's vallen niet
  onder Smart App Control, dus bouwen en testen werkt lokaal. VS Code werkt erin via de
  WSL-extensie.
- *Een dev container met Docker.* Reproduceerbaar: de hele omgeving staat als bestand in de
  repo. Maar Docker Desktop draait op Windows zelf óp WSL2, dus het is een extra laag
  bovenop dezelfde basis. Daarbij komen poortdoorsturing, HTTPS-certificaten voor
  ontwikkeling in de container en de doorverwijzing na het inloggen met Entra ID.

**Keuze**
WSL2 met Ubuntu, de .NET 10 SDK in WSL2 en VS Code met de WSL-extensie. De code staat in mijn
Linux-home (`~/repos/...`), niet op een Windows-schijf: dat is sneller, en bestanden op de
Windows-schijf vallen weer onder Windows. GitHub Actions blijft als controle dat het ook
buiten mijn pc werkt.

Docker leer ik op een plek waar het beter past: bij het uitrollen van de app in het lab
([#24](https://github.com/SamSlaats/autorisatiematrix/issues/24)). Daar gaat het om een image
bouwen en draaien, wat dichter bij systeembeheer ligt dan ontwikkelen in een container.

**Gevolgen**
Eenmalig WSL2 inrichten en Git en GitHub daarin opnieuw instellen
([#30](https://github.com/SamSlaats/autorisatiematrix/issues/30)). Daarna een snelle
testlus. De omgeving is minder reproduceerbaar dan met een dev container: een tweede
pc moet ik met de hand inrichten.

## 2. Vijf lagen in de solution

**Context**
De code moet ergens worden opgedeeld. Het hart van de app is de rechtenlogica (rollen,
uitzonderingen, de vergelijking tussen gewenst en werkelijk), en die moet te testen zijn
zonder Microsoft Graph, database of tenant. Later komt er naast Entra ID een tweede
doelsysteem bij: on-prem AD.

**Opties**
- *Vijf projecten: Domain, Application, Infrastructure, Web, Tests.* De afhankelijkheden
  lopen één kant op, naar Domain toe, en de compiler bewaakt dat. Het meeste werk en de
  meeste bestanden.
- *Drie projecten: Core, Infrastructure, Web.* Minder ceremonie, nog steeds een harde
  scheiding tussen logica en buitenwereld.
- *Eén webproject met mappen per laag.* Het eenvoudigst, maar niets houdt tegen dat de
  rechtenlogica per ongeluk de database of Graph aanroept.

**Keuze**
Vijf lagen. Het leerdoel is juist die scheiding begrijpen: waarom Domain van niets afhankelijk
is, en waarom Infrastructure naar Application wijst en niet andersom. Application beschrijft
wat de app nodig heeft (de interface `IDirectoryTarget`), Infrastructure levert het
(`EntraTarget`, later `AdTarget`).

**Gevolgen**
Voor een app van deze omvang is vijf projecten zwaar; drie zou in de praktijk vaak genoeg
zijn. Het levert wel op dat AD in fase M7 erbij kan zonder de vergelijkingslogica aan te
raken.

## 3. xUnit v3 en Shouldly, test-doubles zelf schrijven

**Context**
Er moet een testframework en een manier van controleren worden gekozen. Mijn eis: gratis.
De keuze zelf liet ik aan Claude.

**Opties**
- *Framework:* xUnit, NUnit of MSTest. Alle drie gratis en open source.
- *Asserts:* de ingebouwde asserts, Shouldly, of FluentAssertions. FluentAssertions is sinds
  versie 8 betaald voor commercieel gebruik.
- *Test-doubles:* een mocking-library (Moq, NSubstitute) of zelf een nep-implementatie
  schrijven.

**Keuze**
xUnit v3 als framework, omdat het in moderne .NET-projecten het meest gebruikt wordt.
Shouldly voor asserts die leesbaar zijn en duidelijke foutmeldingen geven. Geen
mocking-library: een `FakeDirectoryTarget` schrijf ik zelf, zodat ik zie wat een
test-double precies doet.

**Gevolgen**
Twee pakketten, allebei gratis. Een zelfgeschreven fake is meer code dan een regel met Moq,
maar er zit geen verborgen gedrag in. Componenttests voor Blazor (bUnit) zijn bewust
uitgesteld: de logica zit in Domain en Application, niet in de pagina's.

## 4. Een branch per issue, met een pull request

**Context**
Ik wil me verder verdiepen in Git. Elk issue in de repo is een stap in de leerroute.

**Opties**
- *Direct op `main` werken.* Snel, maar geen moment om te controleren voordat iets in `main`
  komt.
- *Een branch per issue, samenvoegen via een pull request.* Zo werken de meeste bedrijven
  (GitHub flow). De pipeline draait op elke pull request.

**Keuze**
Een branch per issue, genoemd naar het issue (bijvoorbeeld `1-solution-structuur`), en een
pull request met `Closes #<nummer>` zodat het issue automatisch sluit. Samenvoegen pas als
de pipeline groen is.

**Gevolgen**
Iets meer stappen per issue. Branch protection, waarmee GitHub een groene pipeline
afdwingt, is op GitHub Free niet beschikbaar voor privérepo's. Zolang de repo privé is,
hangt het af van mijn eigen discipline.

## 5. De bestaande tenant van mijn Microsoft-account als testtenant

**Context**
De app leest en wijzigt groepslidmaatschappen via Microsoft Graph. Dat mag alleen in een
eigen testomgeving, nooit in een tenant van een werkgever, stagebedrijf of Illuvex. Ik had
nog geen eigen tenant, en dacht dat ik die niet met een privé-mailadres kon aanmaken.

**Opties**
- *Microsoft 365 Developer Program (E5-sandbox).* Niet beschikbaar zonder Visual
  Studio-abonnement of partnerstatus.
- *Een nieuwe tenant aanmaken via "Manage tenants".* Vraagt om een betaald abonnement:
  gratis accounts en proefabonnementen mogen geen extra tenants aanmaken.
- *Overstappen op pay-as-you-go.* Dan mag het wel, en alles wat dit project gebruikt is
  gratis. Maar er is geen bestedingslimiet: een vergeten virtuele machine wordt gewoon
  afgeschreven.
- *De tenant die al bij mijn Microsoft-account hoorde.* Er bleek al een "Standaardmap" te
  bestaan, op Entra ID Free.

**Keuze**
De bestaande tenant. Eerst gecontroleerd dat hij leeg was: alleen mijn eigen account, geen
groepen en geen app-registraties. Daarna hernoemd naar Verbeek Logistiek, hetzelfde
fictieve bedrijf als in [mijn VMware-lab](/verbeek-logistiek/). Als ik in een latere fase
een on-prem AD aan deze tenant koppel, horen het lab en de tenant zo bij dezelfde
organisatie.

Ik werk in de tenant met een apart beheeraccount, met Global Administrator en MFA (de
security defaults staan aan). Mijn privé-account blijft Global Administrator, maar alleen
als noodaccount, voor als ik met het beheeraccount niet meer binnenkom.

**Gevolgen**
Geen kosten en geen licenties. Twee beperkingen van Entra ID Free: een app-rol kan alleen
aan losse gebruikers worden toegewezen, niet aan een groep (dat vereist P1), en een eigen
Entra-rol (custom role) maken kan niet. Dat laatste heb ik niet nodig: de app gebruikt een
app-rol, zie beslissing 9. Het domein van de tenant (`...onmicrosoft.com`) is bij het
aanmaken automatisch gekozen en kan niet meer worden gewijzigd.

## 6. In CI dezelfde SDK-band als lokaal

**Context**
In `global.json` staat welke .NET SDK het project gebruikt, zodat de pipeline in GitHub
Actions met dezelfde versie bouwt als ik in WSL2. Eerst stond `rollForward` op
`latestFeature`, zodat een update van Ubuntu de build niet zou breken.

In de log van de eerste groene run zag ik dat de pipeline SDK `10.0.403` gebruikte. Lokaal
heb ik `10.0.114`. Met `latestFeature` mag elke nieuwere .NET 10-SDK, en op de machines van
GitHub stond die al.

**Opties**
- *`latestFeature` laten staan.* Werkt nu, maar een andere feature band (het middelste
  cijfer, 1 tegenover 4) kan andere waarschuwingen geven. Omdat waarschuwingen in dit
  project fouten zijn, kan de pipeline dan rood worden terwijl het lokaal groen is, of
  andersom.
- *`latestPatch`.* Alleen het laatste cijfer mag hoger zijn: elke `10.0.1xx` is goed.

**Keuze**
`latestPatch`. Ubuntu levert .NET 10 alleen in de 1xx-band, dus een update breekt de build
niet. Na de wijziging gebruikte de pipeline ook `10.0.114`.

**Gevolgen**
Lokaal en in CI dezelfde compiler en dezelfde controles. Ga ik ooit over op een SDK uit
een andere band, dan moet `global.json` mee.

## 7. Nu een client secret, een certificaat bij het uitrollen

**Context**
De app moet aan Entra ID bewijzen dat hij echt deze app is, om via Graph gebruikers te
lezen en groepen te wijzigen.

**Opties**
- *Client secret.* Een lange tekst, een soort wachtwoord, dat bij elke aanmelding wordt
  meegestuurd. Wie hem heeft, kan zich als de app voordoen.
- *Certificaat.* Een sleutelpaar: Entra krijgt het publieke deel, het privé-deel verlaat de
  machine nooit. Veiliger, en wat Microsoft aanraadt voor productie.

**Keuze**
Voor het ontwikkelen een client secret, 180 dagen geldig, opgeslagen met
`dotnet user-secrets`: in mijn Linux-home, buiten de repo. In de repo staat alleen het id
dat naar die map verwijst. User-secrets bestaat alleen tijdens het ontwikkelen; zodra de
app op een server in het lab draait, moet het toch anders. Dat is het moment voor een
certificaat.

**Gevolgen**
Het secret moet nooit in Git, in een chat of in de shellgeschiedenis komen. Daarom sla ik
het op via `read -rs` en een variabele. Voor het pushen controleer ik met
`git log -p --all` dat het nergens in de geschiedenis staat. Bij het uitrollen in het lab
komt er een certificaat bij, en gaat het secret weg.

## 8. De configuratie heet EntraId, niet Graph

**Context**
De drie gegevens in user-secrets (tenant-ID, client-ID en het secret) noemde ik eerst
`Graph:...`, omdat ze voor Microsoft Graph waren. Bij het inloggen in de app bleken
dezelfde gegevens ook voor het inloggen nodig te zijn.

**Opties**
- *`Graph` laten staan* en de bibliotheek vertellen die groep te lezen. Niets opnieuw
  invoeren, maar een naam die niet meer klopt.
- *Hernoemen naar `EntraId`.* De gegevens opnieuw opslaan.

**Keuze**
Hernoemen naar `EntraId`. In `appsettings.json` staan onder dezelfde naam de instellingen
die geen geheim zijn: het adres van de inlogdienst en de paden waar Entra na het in- en
uitloggen naartoe stuurt. .NET voegt de twee groepen samen.

**Gevolgen**
Bij het overzetten bleek met een lengtecontrole dat er bij `Graph:ClientSecret` de
*Secret ID* was opgeslagen in plaats van het secret zelf. Dat is hersteld met een nieuw
secret; het oude is verwijderd. Er is daarbij geen echt geheim uitgelekt: de Secret ID is
geen geheim.

## 9. Een app-rol, en een Matrixbeheerder zonder beheerdersrol

**Context**
Alleen wie de autorisatiematrix beheert, mag de app gebruiken. Ik zocht eerst een eigen
rol onder *Roles and administrators* in Entra, maar die vraagt om Entra ID P1 of P2.

**Opties**
- *Een Entra-rol (custom role).* Bepaalt wat iemand in Entra zelf mag, afgedwongen door
  Microsoft. Vereist P1 of P2, en past niet bij de vraag: het gaat om toegang tot mijn
  app, niet tot Entra.
- *Een app-rol op de app-registratie.* Een label dat Entra bij het inloggen in het token
  zet. De app bepaalt zelf wat het label betekent. Gratis.

**Keuze**
De app-rol `Matrixbeheerder`. Die heb ik toegewezen aan een aparte testgebruiker op de
afdeling ICT, **zonder** beheerdersrol in Entra. De app wijzigt groepen met zijn eigen
rechten (application permissions), dus de Matrixbeheerder hoeft zelf geen beheerder van
de tenant te zijn. In de app is de rol de regel voor elke pagina: wie hem niet heeft, komt
nergens in.

**Gevolgen**
De app moet de rol zelf controleren; Entra weet niet wat Matrixbeheerder mag. De waarde
van de rol moet in de code precies hetzelfde gespeld zijn als in de portal. En omdat de
app met zijn eigen rechten bij elke gewone beveiligingsgroep in de tenant kan, moet de app
ook zelf bewaken dat hij alleen aan de AUTH-groepen komt.
