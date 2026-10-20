"""Conservative bilingual routing for the fixture's supported questions.

This is deliberately a small vocabulary, not a general football question parser.
Unknown intent words or player names must not silently become passing statistics.
"""
import re

TOPICS = {
    "switch": r"\b(?:switch(?:es|ing)?(?:\s+of\s+play)?|(?:spiel)?verlagerung(?:en)?)\b",
    "overload": r"\b(?:overloads?|überzahl(?:situationen?)?|ueberzahl|numerical advantage)\b",
    "pressing": r"\b(?:pressing|pressure|druck|pressingdurchbruch|pressingdurchbrüche)\b",
    "compare": r"\b(?:compare|comparison(?:s)?|vergleich(?:e|en)?|periods?|spielphasen?|phasenvergleich)\b",
}
PLAYER_INTENT = r"\b(?:players?|spieler|passes|pass|passing|pässe|paesse|passspiel|passquote|passstatistik(?:en)?|spielerstatistik(?:en)?|performance|leistung)\b"
FILLER = set("""
a an the this that these those which what how why did does do is was were has have
had of for from to in on at with under and or by me please show explain analyse
analyze tell describe assess evaluate give about his their selected current
team teams player players play played perform performed performance stats
statistics successful completed complete completes count counts many much total totals make made often progressive forward now so far observed
welche welcher welches welchen was wie warum hat haben hatte hatten ist sind
war waren von für fuer mit im in am an auf bis zum zur die der das den dem des ein
eine einen einer einem und oder mir bitte zeig zeige erklär erkläre erklaere
analysiere analysieren bewerte beschreibe spielte spielten gespielt spielt
spieler mannschaft team teams ausgewählten ausgewählter ausgewählte aktuelle
aktuellen bisher seine seiner seinen ihre ihren erfolgreiche erfolgreichen
viele vielen wieviel wieviele anzahl insgesamt angekommen angekommene erfolgreich progressiv progressive progressiven vorwärts pässe
paesse pass passes passing passspiel passquote passstatistik passstatistiken
spielerstatistik spielerstatistiken leistung
""".split())


def route_query(match, request):
    query = request.query.strip().casefold()
    if not query:
        return request.question, match.players[request.player_id], False
    named = [p for p in match.players if any(
        re.search(r"\b"+re.escape(name.casefold())+r"\b", query)
        for name in (p.name, p.name.split()[-1])
    )]
    topics = [topic for topic, pattern in TOPICS.items() if re.search(pattern, query)]
    player = named[0] if len(named) == 1 else match.players[request.player_id]
    remainder = query
    for p in named:
        for name in (p.name, p.name.split()[-1]):
            remainder = re.sub(r"\b"+re.escape(name.casefold())+r"\b", " ", remainder)
    # English possessive is grammatical; arbitrary suffixes remain unsupported.
    remainder = re.sub(r"['’]s\b", " ", remainder)
    for pattern in TOPICS.values():
        remainder = re.sub(pattern, " ", remainder)
    unknown = set(re.findall(r"\b\w+\b", remainder)) - FILLER
    supported_intent = bool(topics or named or re.search(PLAYER_INTENT, query))
    unsupported = len(topics) > 1 or len(named) > 1 or not supported_intent or bool(unknown)
    return topics[0] if topics else "player", player, unsupported
