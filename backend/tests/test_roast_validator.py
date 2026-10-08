import pytest
from app.models.evidence import RoastAngle
from app.services.roast_validator import (
    AntiRepetitionBuffer,
    RoastValidator,
    compute_bigram_jaccard,
    roast_validator,
)


def test_bigram_jaccard_identical():
    s1 = "Your repository has no readme and no live demo."
    s2 = "Your repository has no readme and no live demo."
    assert compute_bigram_jaccard(s1, s2) == 1.0


def test_bigram_jaccard_completely_different():
    s1 = "Your repository has no readme."
    s2 = "The sky is blue and the grass is green."
    assert compute_bigram_jaccard(s1, s2) == 0.0


def test_bigram_jaccard_partial_overlap():
    s1 = "Exhibit A entered into evidence: repository has no readme."
    s2 = "Exhibit A entered into evidence: project lacks documentation."
    sim = compute_bigram_jaccard(s1, s2)
    assert 0.2 < sim < 0.7


def test_banned_stock_openers():
    validator = RoastValidator()
    # Test stock openers
    assert validator.validate_banned_phrases("Ah, look at this repository.")[0] is False
    assert validator.validate_banned_phrases("Well, well, what do we have here?")[0] is False
    assert validator.validate_banned_phrases("Looks like your repository is empty.")[0] is False
    assert validator.validate_banned_phrases("It seems that you have no demos.")[0] is False
    assert validator.validate_banned_phrases("Congratulations on your 5 stars.")[0] is False

    # Test clean opener
    assert validator.validate_banned_phrases("Repository 'demo-app' lacks a live deployment link.")[0] is True


def test_banned_cliches():
    validator = RoastValidator()
    assert validator.validate_banned_phrases("Your profile is a graveyard of unfinished side projects.")[0] is False
    assert validator.validate_banned_phrases("This repo is a digital monument to short attention spans.")[0] is False
    assert validator.validate_banned_phrases("Clean architectural design across alpha-app.")[0] is True


def test_evidence_grounding_citation_count():
    validator = RoastValidator()
    angles = [
        RoastAngle(
            id="star_monopoly",
            fact_description="breakout-app holds 90% of stars",
            supporting_numbers={"top_repo_stars": 90, "total_stars": 100},
            repo_names=["breakout-app"],
        )
    ]

    # Cites 0 details
    ok0, count0, _ = validator.validate_evidence_grounding("Your profile needs work.", angles)
    assert ok0 is False and count0 == 0

    # Cites 1 detail (only repo name)
    ok1, count1, _ = validator.validate_evidence_grounding("Repository breakout-app needs documentation.", angles)
    assert ok1 is False and count1 == 1

    # Cites 2 details (repo name + 90)
    ok2, count2, _ = validator.validate_evidence_grounding("Repository breakout-app holds 90 stars with no tests.", angles)
    assert ok2 is True and count2 == 2


def test_anti_repetition_buffer():
    buf = AntiRepetitionBuffer(maxlen=5)
    roast1 = "Repository 'alpha' has 50 stars but zero documentation or automated tests."
    buf.add_roast(roast1)

    # Near duplicate
    near_dup = "Repository 'alpha' has 50 stars but zero documentation or unit tests."
    is_unique, sim, _ = buf.check_similarity(near_dup, threshold=0.6)
    assert is_unique is False
    assert sim >= 0.6

    # Completely different roast
    diff_roast = "Counsel presents Exhibit B regarding 'beta-service' abandoned in 2021."
    is_unique_diff, sim_diff, _ = buf.check_similarity(diff_roast, threshold=0.6)
    assert is_unique_diff is True
    assert sim_diff < 0.3
