import collections
import re
from typing import Any, Deque, Dict, List, Optional, Set, Tuple

from app.banned_phrases import BANNED_PHRASES
from app.models.evidence import RoastAngle

STOCK_OPENER_PATTERN = re.compile(
    r"^\s*(ah[,.]|well[,.]?\s+well|looks like|it looks like|congratulations on|it seems|here we have|so[,]? you want|stepping into|welcome to|let's talk about|as an engineer|meet\b)",
    re.IGNORECASE,
)


def compute_bigram_jaccard(text1: str, text2: str) -> float:
    """Computes word bigram Jaccard similarity between two texts."""
    words1 = re.findall(r"\w+", text1.lower())
    words2 = re.findall(r"\w+", text2.lower())
    if len(words1) < 2 or len(words2) < 2:
        return 0.0
    bg1: Set[Tuple[str, str]] = set(zip(words1[:-1], words1[1:]))
    bg2: Set[Tuple[str, str]] = set(zip(words2[:-1], words2[1:]))
    if not bg1 or not bg2:
        return 0.0
    intersection = bg1.intersection(bg2)
    union = bg1.union(bg2)
    return len(intersection) / len(union) if union else 0.0


class AntiRepetitionBuffer:
    def __init__(self, maxlen: int = 50):
        self._buffer: Deque[str] = collections.deque(maxlen=maxlen)

    def check_similarity(
        self, candidate_roast: str, threshold: float = 0.6
    ) -> Tuple[bool, float, Optional[str]]:
        """
        Returns (is_unique, max_similarity, most_similar_roast).
        If max_similarity >= threshold, is_unique will be False.
        """
        if not self._buffer:
            return True, 0.0, None

        max_sim = 0.0
        most_similar = None
        for past_roast in self._buffer:
            sim = compute_bigram_jaccard(candidate_roast, past_roast)
            if sim > max_sim:
                max_sim = sim
                most_similar = past_roast

        if max_sim >= threshold:
            return False, max_sim, most_similar
        return True, max_sim, None

    def add_roast(self, roast: str) -> None:
        if roast and roast.strip():
            self._buffer.append(roast.strip())

    def clear(self) -> None:
        self._buffer.clear()

    @property
    def size(self) -> int:
        return len(self._buffer)


class RoastValidator:
    def __init__(self):
        self.buffer = AntiRepetitionBuffer(maxlen=50)

    def validate_banned_phrases(self, roast_text: str) -> Tuple[bool, Optional[str]]:
        """Checks for stock openers and forbidden clichés."""
        if STOCK_OPENER_PATTERN.search(roast_text):
            match = STOCK_OPENER_PATTERN.search(roast_text)
            return False, f"Stock opener detected: '{match.group(0).strip()}'"

        text_lower = roast_text.lower()
        for phrase in BANNED_PHRASES:
            clean_phrase = phrase.strip().lower().rstrip(",")
            if clean_phrase and clean_phrase in text_lower:
                return False, f"Banned phrase detected: '{phrase}'"

        return True, None

    def validate_evidence_grounding(
        self,
        roast_text: str,
        angles: List[RoastAngle],
        extra_repo_names: Optional[List[str]] = None,
    ) -> Tuple[bool, int, List[str]]:
        """
        Verifies that the roast mentions at least 2 identifiers from the evidence pack
        (repo names or exact significant supporting numbers).
        """
        text_lower = roast_text.lower()
        cited: List[str] = []

        # 1. Search for repo names
        candidate_repos = set()
        for a in angles:
            for r in a.repo_names:
                if r:
                    candidate_repos.add(r.lower())
        if extra_repo_names:
            for r in extra_repo_names:
                if r:
                    candidate_repos.add(r.lower())

        for repo in candidate_repos:
            # Match repo name as a whole word / code token
            if re.search(rf"\b{re.escape(repo)}\b", text_lower):
                cited.append(repo)

        # 2. Search for distinctive supporting numbers
        candidate_numbers = set()
        for a in angles:
            for k, val in a.supporting_numbers.items():
                if isinstance(val, (int, float)):
                    # Ignore trivial binary/unary numbers like 0 or 1 that match everywhere
                    if val not in (0, 1):
                        num_str = f"{val:.1f}" if isinstance(val, float) else str(val)
                        candidate_numbers.add(num_str)

        for num in candidate_numbers:
            if re.search(rf"\b{re.escape(num)}\b", text_lower):
                cited.append(num)

        unique_citations = list(dict.fromkeys(cited))
        count = len(unique_citations)
        return (count >= 2, count, unique_citations)

    def validate_all(
        self,
        roast_text: str,
        angles: List[RoastAngle],
        extra_repo_names: Optional[List[str]] = None,
        check_similarity: bool = True,
        similarity_threshold: float = 0.6,
    ) -> Tuple[bool, Optional[str]]:
        """
        Runs complete validation chain:
        1. Banned phrases / stock openers
        2. Evidence grounding (minimum 2 citations)
        3. Anti-repetition check against ring buffer
        """
        # 1. Banned phrases
        ok_phrases, err_phrases = self.validate_banned_phrases(roast_text)
        if not ok_phrases:
            return False, err_phrases

        # 2. Evidence grounding
        ok_grounding, count, citations = self.validate_evidence_grounding(
            roast_text, angles, extra_repo_names
        )
        if not ok_grounding:
            return False, f"Insufficient evidence grounding: cited only {count} details (needs >= 2)."

        # 3. Ring buffer similarity
        if check_similarity:
            is_unique, max_sim, matching = self.buffer.check_similarity(
                roast_text, threshold=similarity_threshold
            )
            if not is_unique:
                return False, f"Near-duplicate of recent roast (Jaccard bigram similarity {max_sim:.2f})."

        return True, None

    def register_roast(self, roast_text: str) -> None:
        """Adds an approved roast to the anti-repetition buffer."""
        self.buffer.add_roast(roast_text)


roast_validator = RoastValidator()
