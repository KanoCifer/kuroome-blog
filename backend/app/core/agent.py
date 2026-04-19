from __future__ import annotations

import hashlib
import re
from collections.abc import AsyncIterator
from typing import Literal

from agno.agent import Agent, RunOutputEvent
from agno.db.base import SessionType
from agno.db.redis import RedisDb
from agno.models.openai.like import OpenAILike
from agno.tools.websearch import WebSearchTools

from app.core.config import settings
from app.core.logger import logger
from app.schemas.aiagent import WeatherAnalysisInput


class ArticleSummarizer:
    _SYSTEM_PROMPT = (
        "你是一名专业的中文内容分析师，擅长从文章中提炼结构化知识。\n\n"
        "## 任务目标\n"
        "将文章压缩为高信息密度的总结，帮助读者在 2 分钟内掌握核心内容。\n\n"
        "## 内容优先级（从高到低）\n"
        "1. **核心论点**：文章最想传达的主张或结论\n"
        "2. **关键事实/数据**：支撑论点的具体数字、研究、案例\n"
        "3. **技术细节**：代码、命令、配置片段——必须说明其作用，不可省略\n"
        "4. **背景与铺垫**：仅保留理解核心内容所必需的部分\n\n"
        "## 输出格式（严格遵守）\n"
        "用数字编号分点，每点一句话，最后附一段「总评」：\n"
        "1. ...\n"
        "2. ...\n"
        "N. ...\n\n"
        "总评：[1-2 句话，说明文章的整体价值或局限性]\n\n"
        "## 约束\n"
        "- 纯文本输出，禁止使用 Markdown 标记（无 #、**、- 等）\n"
        "- 禁止编造原文没有的信息\n"
        "- 总结长度控制在原文的 10-15%，不超过 500 字\n"
        "- 若原文含代码/命令，至少用 1 条要点说明其功能与重要性"
    )
    _CHAT_SYSTEM_PROMPT = (
        "你是一名中文知识助手，陪伴用户深入探讨已阅读的文章。\n\n"
        "## 角色定位\n"
        "用户已读完文章并看过总结，现在希望进一步讨论、追问或延伸学习。\n\n"
        "## 行为准则\n"
        "- 优先基于文章内容和对话历史作答，给出文章中的原始依据\n"
        '- 若问题超出文章范围，使用搜索工具补充最新信息，并明确说明"以下来自搜索结果"\n'
        "- 对有争议或不确定的内容，主动提示局限性，不过度自信\n"
        "- 遇到技术问题，可以展开解释背后的原理，结合文章上下文举例\n\n"
        "## 回复风格\n"
        "- 简洁直接，不重复用户问题，不堆砌废话\n"
        "- 纯文本输出，禁止使用 Markdown 格式\n"
        "- 若需要列举，使用数字编号"
    )
    _MAX_INPUT_CHARS = 128_000
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(self) -> None:
        self._model = OpenAILike(
            id="Ling-2.5-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=1,
            timeout=60,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._SYSTEM_PROMPT,
            tools=[WebSearchTools(backend="bing")],
            db=ArticleSummarizer.DB,
            add_history_to_context=True,
            num_history_runs=10,
        )

        self._chat_agent = Agent(
            model=self._model,
            instructions=self._CHAT_SYSTEM_PROMPT,
            tools=[WebSearchTools(backend="bing")],
            db=ArticleSummarizer.DB,
            add_history_to_context=True,
            num_history_runs=10,
        )

    def _build_user_prompt(
        self, normalized_content: str, title: str | None = None
    ) -> str:
        user_prompt = (
            "请总结下面文章内容，按要点进行总结，最后补一段总评。"
            "如果正文里出现代码/命令/配置，请至少用 1 条要点说明代码做了什么、为什么重要。\n\n"
        )
        if title:
            user_prompt += f"标题：{title}\n\n"
        user_prompt += f"正文：{normalized_content}"
        return user_prompt

    def _normalize_content(self, content: str) -> str:
        # 去掉简单 HTML 标签并收敛连续空白，降低 token 开销
        text = re.sub(r"<[^>]+>", " ", content)
        text = re.sub(r"\s+", " ", text).strip()
        return text[: self._MAX_INPUT_CHARS]

    @staticmethod
    def _hash_article(title: str | None, content: str) -> str:
        text = f"{title or ''}:{content[:5000]}"
        return hashlib.md5(text.encode()).hexdigest()[:16]

    @staticmethod
    def _article_session_id(
        user_id: str, article_hash: str, prefix: str = "summary"
    ) -> str:
        return f"{prefix}:{user_id}:{article_hash}"

    async def get_summary_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            for session in all_sessions:
                sid = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                if sid != session_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    return None
                last_run = runs[-1]
                response = (
                    last_run.get("content")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "content", None)
                    or getattr(last_run, "response", None)
                )
                if response:
                    return {
                        "session_id": session_id,
                        "summary": response,
                        "created_at": (
                            session.get("created_at")
                            if isinstance(session, dict)
                            else getattr(session, "created_at", None)
                        ),
                        "updated_at": (
                            session.get("updated_at")
                            if isinstance(session, dict)
                            else getattr(session, "updated_at", None)
                        ),
                    }
            logger.debug(f"无缓存 session: {session_id}")
        except Exception as e:
            logger.warning(f"获取总结缓存失败: {e}")
        return None

    async def get_chat_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "chat")
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            for session in all_sessions:
                sid = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                if sid != session_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    return None
                messages = []
                for run in runs:
                    msg = (
                        run.get("message")
                        if isinstance(run, dict)
                        else getattr(run, "message", None)
                        or getattr(run, "input", None)
                    )
                    resp = (
                        run.get("content")
                        if isinstance(run, dict)
                        else getattr(run, "content", None)
                        or getattr(run, "response", None)
                    )
                    if msg:
                        messages.append({"role": "user", "content": msg})
                    if resp:
                        messages.append({"role": "assistant", "content": resp})
                return {
                    "session_id": session_id,
                    "messages": messages,
                    "created_at": (
                        session.get("created_at")
                        if isinstance(session, dict)
                        else getattr(session, "created_at", None)
                    ),
                    "updated_at": (
                        session.get("updated_at")
                        if isinstance(session, dict)
                        else getattr(session, "updated_at", None)
                    ),
                }
            logger.debug(f"无对话缓存: {session_id}")
        except Exception as e:
            logger.warning(f"获取对话历史失败: {e}")
        return None

    async def get_user_sessions(self, user_id: str) -> list[dict]:
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            user_sessions = []
            for session in all_sessions:
                session_user_id = (
                    session.get("user_id")
                    if isinstance(session, dict)
                    else getattr(session, "user_id", None)
                )
                if session_user_id != user_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    continue
                last_run = runs[-1]
                last_msg = (
                    last_run.get("message")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "message", None)
                )
                last_resp = (
                    last_run.get("response")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "response", None)
                    or getattr(last_run, "content", None)
                )
                session_id = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                user_sessions.append(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "last_message": last_msg[:100] if last_msg else None,
                        "last_response_preview": (
                            last_resp[:200] if last_resp else None
                        ),
                        "run_count": len(runs),
                        "created_at": (
                            session.get("created_at")
                            if isinstance(session, dict)
                            else getattr(session, "created_at", None)
                        ),
                        "updated_at": (
                            session.get("updated_at")
                            if isinstance(session, dict)
                            else getattr(session, "updated_at", None)
                        ),
                    }
                )
            user_sessions.sort(
                key=lambda x: x.get("updated_at") or 0, reverse=True
            )
            return user_sessions
        except Exception as e:
            logger.error(f"获取用户 session 列表失败: {e}")
            return []

    async def summarize_article_stream(
        self, content: str, title: str | None = None
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("文章内容不能为空")

        user_prompt = self._build_user_prompt(
            normalized_content=normalized,
            title=title,
        )

        async for event in self._agent.arun(user_prompt, stream=True):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def run_summarization_astream(
        self, content: str, user_id: str, title: str | None = None
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("文章内容不能为空")

        user_prompt = self._build_user_prompt(
            normalized_content=normalized,
            title=title,
        )

        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")

        async for event in self._agent.arun(
            user_prompt, stream=True, user_id=user_id, session_id=session_id
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def chat_stream(
        self,
        message: str,
        user_id: str,
        session_id: str,
        article_content: str | None = None,
        article_title: str | None = None,
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        if not message.strip():
            raise ValueError("消息不能为空")

        context_prefix = ""
        if article_content:
            normalized = self._normalize_content(article_content)
            if normalized:
                context_prefix = (
                    f"[文章上下文]\n标题: {article_title or '无标题'}\n"
                    f"内容摘要: {normalized[:2000]}...\n\n"
                )

        full_message = f"{context_prefix}用户问题: {message}"

        async for event in self._chat_agent.arun(
            full_message,
            session_id=session_id,
            user_id=user_id,
            stream=True,
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)


article_summarizer = ArticleSummarizer()


class WeatherAnalyzer:
    _SYSTEM_PROMPT = (
        "你是一名专业的垂钓气象与潮汐分析师，擅长综合天气和潮汐数据判断钓鱼条件。\n\n"
        "## 分析维度\n"
        "依次评估以下因素对钓鱼的影响：\n"
        "- **温度**：鱼类活跃度随水温变化，15-25°C 通常最佳\n"
        "- **风速风向**：微风（3-15 km/h）有利于钓鱼；强风（>30 km/h）危险\n"
        "- **气压**：高气压稳定（>1013 hPa）适合钓鱼；气压骤降时鱼口差\n"
        "- **降水**：小雨可提升鱼口；暴雨/雷暴禁止出钓\n"
        "- **潮汐**：涨潮前后 1-2 小时（尤其高潮前）通常是最佳钓鱼窗口；\n"
        "  大潮差（高低潮落差 >2m）水流湍急，鱼不易开口；\n"
        "  平潮期（高/低潮后 30 分钟内）水流缓，适合底钓\n"
        "- **云量/光照**：阴天或多云通常优于正午烈日\n\n"
        "## 输出格式（严格遵守）\n"
        "## 钓鱼指数：XX / 100\n\n"
        "**出钓建议**：一句话概括（极佳 / 良好 / 一般 / 不宜 / 禁止）\n\n"
        "### 逐项分析\n"
        "| 维度 | 当前状况 | 影响评估 |\n"
        "|------|----------|----------|\n"
        "| 温度 | ... | ... |\n"
        "| 风况 | ... | ... |\n"
        "| 气压 | ... | ... |\n"
        "| 降水 | ... | ... |\n"
        "| 潮汐 | ... | ... |\n\n"
        "### 最佳出钓窗口\n"
        "根据潮汐表，今日推荐时段：HH:MM - HH:MM（说明原因）\n\n"
        "### 建议\n"
        "- 出钓建议（时段/钓点/装备）\n"
        "- 注意事项或安全提示\n\n"
        "## 评分规则\n"
        "- 先按专家权重计算基准分（归一化权重，总和=1）：\n"
        "  w1_temp=4/23, w2_humidity=2/23, w3_pressure=2/23, w4_wind=2/23,\n"
        "  w5_rain=1/23, w6_tide_rising=4/23, w7_hours_to_tide=4/23,\n"
        "  w8_tide_range=2/23, w9_indices=2/23\n"
        "- Expert_score = Σ(weight_i * feature_score_i) * 100，feature_score_i 范围 [0,1]，但 pressure 特征可达 [0,2]\n"
        "- 再给出 AI 自主修正分（-20~20），并说明修正依据（短时天气波动、天气现象、潮汐时序）\n"
        "- 最终钓鱼指数 = clip(专家基准分 + AI 自主修正分, 0, 100)\n"
        "- 90-100：极佳，强烈推荐\n"
        "- 70-89：良好，适合出钓\n"
        "- 50-69：一般，可以尝试但体验有限\n"
        "- 30-49：不宜，不建议出钓\n"
        "- 0-29：禁止，存在安全风险\n\n"
        "输出时必须显式给出：专家基准分、AI 自主修正分、最终钓鱼指数。\n"
        "若遇雷暴、台风或暴雨，评分直接置 0 并给出安全警告。\n"
        "回答简洁，避免重复原始数据，聚焦分析与建议。"
    )
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(self) -> None:
        self._model = OpenAILike(
            id="Ling-2.5-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=0.8,
            timeout=30,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._SYSTEM_PROMPT,
            db=WeatherAnalyzer.DB,
            tools=[WebSearchTools(backend="bing")],
            add_history_to_context=True,
            num_history_runs=5,
        )

    def _build_user_prompt(self, weather_data: WeatherAnalysisInput) -> str:
        data = weather_data.weather_data
        lines: list[str] = [
            "请综合以下天气与潮汐数据，按专家权重先算基准分，再给出 AI 自主修正分与最终钓鱼指数：\n"
        ]

        fishing_context = data.get("fishingIndex")
        if fishing_context:
            expert_score = fishing_context.get("expert_score")
            residual = fishing_context.get("residual")
            feature_breakdown = fishing_context.get("feature_breakdown")
            if expert_score is not None:
                lines.append(f"【专家基准分】{expert_score}")
            if residual is not None:
                lines.append(f"【历史校正残差】{residual}")
            if feature_breakdown:
                lines.append(f"【专家特征分解】{feature_breakdown}")

        lines.append(
            "【专家权重】w1=0.2,w2=0.1,w3=0.1,w4=0.1,w5=0.05,w6=0.2,w7=0.2,w8=0.1,w9=0.1"
        )

        live = data.get("liveWeather")
        if live:
            lines.append(
                f"【实时天气】{data.get('locationName', '')} "
                f"气温 {live.get('temp')}°C，{live.get('text')}，"
                f"风向 {live.get('wind360') or live.get('windDir')} {live.get('windScale')} 级，"
                f"湿度 {live.get('humidity')}%，"
                f"气压 {live.get('pressure')} hPa，降水 {live.get('precip')} mm"
            )

        forecasts = data.get("forecasts", [])
        if forecasts:
            lines.append("【天气预报】")
            for f in forecasts[:3]:
                lines.append(
                    f"  {f.get('date')} 白天 {f.get('daytemp')}° {f.get('dayweather')} "
                    f"{f.get('daywind')}{f.get('daypower')}级 / "
                    f"夜间 {f.get('nighttemp')}° {f.get('nightweather')}"
                )

        tide = data.get("tideData")
        if tide:
            lines.append(
                f"【潮汐数据】{data.get('tideSpotName', '')} 更新: {tide.get('updateTime', '')}"
            )
            table = tide.get("tideTable", [])
            if table:
                lines.append("  高低潮时刻：")
                for t in table:
                    tag: Literal["高潮"] | Literal["低潮"] = (
                        "高潮" if t.get("type") == "H" else "低潮"
                    )
                    lines.append(
                        f"    {tag} {t.get('fxTime')} {t.get('height')}m"
                    )
                heights = [float(t["height"]) for t in table if "height" in t]
                if heights:
                    tidal_range = max(heights) - min(heights)
                    lines.append(f"  潮差：{tidal_range:.2f}m")
            hourly = tide.get("tideHourly", [])
            if hourly:
                lines.append("  逐时潮高（全天）：")
                for h in hourly:
                    lines.append(f"    {h.get('fxTime')} {h.get('height')}m")

        return "\n".join(lines)

    async def analyze_weather_stream(
        self, weather_data: WeatherAnalysisInput
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        data = (
            str(weather_data)
            if isinstance(weather_data, WeatherAnalysisInput)
            else weather_data
        )

        if not data.strip():
            raise ValueError("天气数据不能为空")

        user_prompt = self._build_user_prompt(weather_data)

        async for event in self._agent.arun(user_prompt, stream=True):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)


weather_analyzer = WeatherAnalyzer()
