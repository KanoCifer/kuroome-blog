import asyncio
from typing import Any, cast

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.configs.config import settings

model = ChatOpenAI(
    model="Ling-1T",
    api_key=SecretStr(settings.API_KEY),
    temperature=0.1,
    timeout=30,
    base_url="https://api.tbox.cn/api/llm/v1",
)

sys_prompt = "你是一个擅长总结文章内容的助手，能够根据用户提供的文章内容进行总结。请根据用户提供的文章内容进行总结，并且总结的内容要简洁明了，突出重点。"

agent = create_agent(model=model, tools=[], system_prompt=sys_prompt)


async def main():
    payload: Any = {"input": "请总结一下这篇文章的内容：<文章内容>"}
    result = await agent.ainvoke(cast(Any, payload))  # type: ignore
    print(result)


# 调用
if __name__ == "__main__":
    asyncio.run(main())
