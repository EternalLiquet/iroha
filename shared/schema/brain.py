from pydantic import BaseModel, ConfigDict, Field

class ChatEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: str
    username: str
    message: str
    timestamp_ms: int = Field(ge = 0)

class BrainResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reply_text: str
    should_speak: bool
    emotion: str
    intensity: float
    safe: bool
    refusal_reason: str | None