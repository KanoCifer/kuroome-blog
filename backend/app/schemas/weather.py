"""Weather API schemas for QWeather responses."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class WeatherRefer(BaseModel):
    """Reference sources for weather data."""

    sources: list[str]
    license: list[str]


class NowWeather(BaseModel):
    """Current weather conditions."""

    obs_time: str = Field(validation_alias="obsTime")
    temp: str = Field(description="Temperature in Celsius")
    feels_like: str = Field(validation_alias="feelsLike")
    icon: str
    text: str
    wind_360: str = Field(
        validation_alias="wind360", description="Wind direction in degrees"
    )
    wind_dir: str = Field(validation_alias="windDir")
    wind_scale: str = Field(validation_alias="windScale")
    wind_speed: str = Field(validation_alias="windSpeed")
    humidity: str = Field(description="Humidity percentage")
    precip: str = Field(description="Precipitation in mm")
    pressure: str = Field(description="Atmospheric pressure in hPa")
    vis: str = Field(description="Visibility in km")
    cloud: str
    dew: str


class CurrentWeather(BaseModel):
    """Current weather response from QWeather."""

    code: str
    update_time: str = Field(validation_alias="updateTime")
    fx_link: str = Field(validation_alias="fxLink")
    now: NowWeather
    refer: WeatherRefer


class HourlyForecast(BaseModel):
    """Hourly forecast item."""

    fx_time: str = Field(validation_alias="fxTime")
    temp: str
    icon: str
    text: str
    wind_360: str = Field(validation_alias="wind360")
    wind_dir: str = Field(validation_alias="windDir")
    wind_scale: str = Field(validation_alias="windScale")
    wind_speed: str = Field(validation_alias="windSpeed")
    humidity: str
    pop: str = Field(description="Probability of precipitation %")
    precip: str
    pressure: str
    cloud: str
    dew: str


class HourlyWeather(BaseModel):
    """Hourly weather forecast response."""

    code: str
    update_time: str = Field(validation_alias="updateTime")
    fx_link: str = Field(validation_alias="fxLink")
    hourly: list[HourlyForecast]
    refer: WeatherRefer


class DailyForecast(BaseModel):
    """Daily forecast item."""

    fx_date: str = Field(validation_alias="fxDate")
    sunrise: str
    sunset: str
    moonrise: str
    moonset: str
    moon_phase: str = Field(validation_alias="moonPhase")
    moon_phase_icon: str = Field(validation_alias="moonPhaseIcon")
    temp_max: str = Field(validation_alias="tempMax")
    temp_min: str = Field(validation_alias="tempMin")
    icon_day: str = Field(validation_alias="iconDay")
    text_day: str = Field(validation_alias="textDay")
    icon_night: str = Field(validation_alias="iconNight")
    text_night: str = Field(validation_alias="textNight")
    wind_360_day: str = Field(validation_alias="wind360Day")
    wind_dir_day: str = Field(validation_alias="windDirDay")
    wind_scale_day: str = Field(validation_alias="windScaleDay")
    wind_speed_day: str = Field(validation_alias="windSpeedDay")
    wind_360_night: str = Field(validation_alias="wind360Night")
    wind_dir_night: str = Field(validation_alias="windDirNight")
    wind_scale_night: str = Field(validation_alias="windScaleNight")
    wind_speed_night: str = Field(validation_alias="windSpeedNight")
    humidity: str
    precip: str
    pressure: str
    vis: str
    cloud: str
    uv_index: str = Field(validation_alias="uvIndex")


class DailyWeather(BaseModel):
    """Daily weather forecast response."""

    code: str
    update_time: str = Field(validation_alias="updateTime")
    fx_link: str = Field(validation_alias="fxLink")
    daily: list[DailyForecast]
    refer: WeatherRefer


class TideItem(BaseModel):
    """Tide table item."""

    fx_time: str = Field(validation_alias="fxTime")
    height: str
    type: Literal["H", "L"] = Field(description="H=High, L=Low")


class TideHourly(BaseModel):
    """Hourly tide height."""

    fx_time: str = Field(validation_alias="fxTime")
    height: str


class TideData(BaseModel):
    """Tide data response."""

    code: str
    update_time: str = Field(validation_alias="updateTime")
    fx_link: str = Field(validation_alias="fxLink")
    tide_table: list[TideItem] = Field(validation_alias="tideTable")
    tide_hourly: list[TideHourly] = Field(validation_alias="tideHourly")
    refer: WeatherRefer


class IndexItem(BaseModel):
    """Daily index item."""

    date: str
    type: str
    name: str
    level: str
    category: str
    text: str


class IndicesData(BaseModel):
    """Weather indices response."""

    code: str
    update_time: str = Field(validation_alias="updateTime")
    fx_link: str = Field(validation_alias="fxLink")
    daily: list[IndexItem]
    refer: WeatherRefer


class WeatherData(BaseModel):
    """Complete weather data container."""

    current: CurrentWeather
    hourly: HourlyWeather
    daily: DailyWeather
    tide: TideData
    indices: IndicesData
    location_name: str = Field(validation_alias="locationName")
    poi_id: str = Field(validation_alias="poiId")


class WeatherResponse(BaseModel):
    """Full weather API response."""

    status: Literal["success", "error"]
    data: WeatherData
    message: str
    code: int
