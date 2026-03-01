from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.configs.config import settings

model = ChatOpenAI(
    model="Ling-1T",
    api_key=SecretStr(settings.API_KEY),
    temperature=1,
    timeout=30,
    base_url="https://api.tbox.cn/api/llm/v1",
)

agent = create_agent(model=model, tools=[])

# 调用
if __name__ == "__main__":
    result = model.invoke("你是谁？")
    print(result)
