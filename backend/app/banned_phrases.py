from typing import List

BANNED_PHRASES: List[str] = [
    # Stock openers
    "ah,",
    "well, well",
    "well, well, well",
    "looks like",
    "it looks like",
    "congratulations on",
    "you have",
    "it seems",
    "here we have",
    "so, you want to be",
    "stepping into",
    "welcome to",
    "meet ",
    "let's talk about",
    "as an engineer,",

    # Overused clichés
    "graveyard of unfinished",
    "graveyard of side projects",
    "digital monument",
    "monument to short attention spans",
    "calling a hello-world a framework",
    "abandoned warehouse",
    "urban legend",
    "jack of all trades",
    "master of none",
    "dusty attic",
    "code cemetery",
    "swiss army knife",

    # Stock closers & cliches
    "in conclusion",
    "at the end of the day",
    "keep coding",
    "happy coding",
    "good luck out there",
]


def format_banned_phrases() -> str:
    return "\n".join(f'- "{phrase}"' for phrase in BANNED_PHRASES)
