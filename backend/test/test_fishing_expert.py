"""Unit tests for app.services.fishing.fishing_expert — pure logic."""

from __future__ import annotations

import pytest

from app.services.fishing.fishing_expert import FishingExpertScorer

scorer = FishingExpertScorer()


def test_weights_sum_to_one() -> None:
    assert sum(scorer.WEIGHTS.values()) == pytest.approx(1.0)


# ── individual feature scorers ────────────────────────────────


def test_score_temperature_optimal():
    assert scorer.score_temperature(20) == 1.0
    assert scorer.score_temperature(25) == 1.0
    assert scorer.score_temperature(28) == 1.0


def test_score_temperature_below_optimal():
    assert scorer.score_temperature(18) == 0.9
    assert scorer.score_temperature(10) == 0.5
    assert scorer.score_temperature(-10) == 0.0


def test_score_temperature_above_optimal():
    assert scorer.score_temperature(30) == 0.9
    assert scorer.score_temperature(38) == 0.5
    assert scorer.score_temperature(50) == 0.0


def test_score_humidity_perfect():
    assert scorer.score_humidity(75) == 1.0


def test_score_humidity_off():
    assert scorer.score_humidity(65) == 0.8
    assert scorer.score_humidity(85) == 0.8
    assert scorer.score_humidity(25) == 0.0


def test_score_pressure():
    assert scorer.score_pressure(1000) == 0.0
    assert scorer.score_pressure(1025) == 1.0
    assert scorer.score_pressure(1050) == 2.0
    assert scorer.score_pressure(2000) == 2.0  # capped


def test_score_wind_low():
    assert scorer.score_wind(0) == 1.0
    assert scorer.score_wind(10.8) == 1.0  # 3 m/s boundary


def test_score_wind_high():
    # 21.6 km/h = 6 m/s → 1.0 - (6-3)*0.33 ≈ 0.01
    assert scorer.score_wind(21.6) == pytest.approx(0.01)
    assert scorer.score_wind(100) == 0.0


def test_score_rain_none():
    assert scorer.score_rain(0) == 1.0


def test_score_rain_light():
    assert scorer.score_rain(1.0) == 0.5
    assert scorer.score_rain(2.4) == 0.5


def test_score_rain_heavy():
    assert scorer.score_rain(2.5) == 0.0
    assert scorer.score_rain(10) == 0.0


def test_score_tide_rising():
    assert scorer.score_tide_rising("涨潮") == 1.0
    assert scorer.score_tide_rising("退潮") == 0.5


def test_score_hours_to_tide():
    assert scorer.score_hours_to_tide(0) == 1.0
    assert scorer.score_hours_to_tide(3) == 0.5
    assert scorer.score_hours_to_tide(6) == 0.0
    assert scorer.score_hours_to_tide(10) == 0.0


def test_score_tide_range():
    assert scorer.score_tide_range(2.5) == 1.0
    assert scorer.score_tide_range(2.0) == 1.0
    assert scorer.score_tide_range(0.5) == 0.3
    assert scorer.score_tide_range(1.5) == 0.55


def test_score_indices():
    assert scorer.score_indices(1) == 1.0
    assert scorer.score_indices(2) == 0.5
    assert scorer.score_indices(3) == 0.0
    assert scorer.score_indices(99) == 0.5  # default


# ── aggregate calculate ───────────────────────────────────────


def test_calculate_perfect_conditions():
    score = scorer.calculate(
        temperature=25,
        humidity=75,
        pressure=1025,
        wind_speed=0,
        precipitation=0,
        tide_type="涨潮",
        hours_to_tide=0,
        tide_range=2.5,
        indices=1,
    )
    assert score == 100.0


def test_calculate_returns_100_for_best_conditions():
    """Original test — best possible input."""
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


def test_calculate_stays_within_bounds_for_poor_conditions():
    """Original test — worst input still within [0, 100]."""
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


def test_calculate_moderate_conditions():
    score = scorer.calculate(
        temperature=15,
        humidity=60,
        pressure=1010,
        wind_speed=15,
        precipitation=1.0,
        tide_type="退潮",
        hours_to_tide=3,
        tide_range=1.5,
        indices=2,
    )
    assert 0 <= score <= 100


def test_get_feature_scores_returns_all_keys():
    scores = scorer.get_feature_scores(
        temperature=25,
        humidity=75,
        pressure=1025,
        wind_speed=0,
        precipitation=0,
        tide_type="涨潮",
        hours_to_tide=0,
        tide_range=2.5,
        indices=1,
    )
    expected_keys = {
        "w1_temp",
        "w2_humidity",
        "w3_pressure",
        "w4_wind",
        "w5_rain",
        "w6_tide_rising",
        "w7_hours_to_tide",
        "w8_tide_range",
        "w9_indices",
    }
    assert set(scores.keys()) == expected_keys
    assert all(0 <= v <= 2 for v in scores.values())
