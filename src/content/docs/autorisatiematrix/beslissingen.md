---
title: Beslissingen
description: Keuzes over de werkwijze en opbouw van de autorisatiematrix, met de afweging erachter.
draft: true
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

## 5. Een eigen testtenant met Entra ID Free

**Context**
De app leest en wijzigt groepslidmaatschappen via Microsoft Graph. Dat mag alleen in een
eigen testomgeving, nooit in een tenant van een werkgever, stagebedrijf of Illuvex. Ik heb
nog geen eigen tenant, en dacht dat ik die niet met een privé-mailadres kon aanmaken.

**Opties**
- *Microsoft 365 Developer Program (E5-sandbox).* Niet beschikbaar voor mij.
- *Een gratis Azure-account met een nieuwe Entra-tenant (Entra ID Free).* Gebruikers,
  beveiligingsgroepen, app-registraties, app-rollen en Graph-rechten voor applicaties zitten
  er allemaal in. Geen Microsoft 365-licenties.

**Keuze**
Een gratis Azure-account op mijn privé Microsoft-account, met daarin een nieuwe tenant op
Entra ID Free. In die tenant werk ik met een eigen beheeraccount, niet met het privé-account.

**Gevolgen**
Geen kosten en geen licenties nodig. Eén beperking: in Entra ID Free kan een app-rol
(`Matrixbeheerder`) alleen aan losse gebruikers worden toegewezen, niet aan een groep.
Daarvoor is Entra ID P1 nodig. Voor een testtenant met een paar accounts is dat geen
probleem.
