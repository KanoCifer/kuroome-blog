import pytest

from app.services.fishing_expert import FishingExpertScorer


def test_weights_sum_to_one() -> None:
    scorer = FishingExpertScorer()

    assert sum(scorer.WEIGHTS.values()) == pytest.approx(1.0)


def test_calculate_returns_100_for_best_conditions() -> None:
    scorer = FishingExpertScorer()

    score = scorer.calculate(
        temperature=24.0,
        humidity=75.0,
        pressure=1050.0,
        wind_speed=0.0,
        precipitation=0.0,
        tide_type="涨潮",
        hours_to_tide=0.0,
        tide_range=2.5,
        indices=1,
    )

    assert score == 100.0


def test_calculate_stays_within_bounds_for_poor_conditions() -> None:
    scorer = FishingExpertScorer()

    score = scorer.calculate(
        temperature=-10.0,
        humidity=0.0,
        pressure=950.0,
        wind_speed=20.0,
        precipitation=50.0,
        tide_type="退潮",
        hours_to_tide=24.0,
        tide_range=0.0,
        indices=3,
    )

    assert 0.0 <= score <= 100.0
