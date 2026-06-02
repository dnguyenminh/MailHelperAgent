"""
OEHA-3/4: Pydantic models for API request/response
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class EmailRequest(BaseModel):
    subject: str = Field(..., max_length=500)
    body: str = Field(..., max_length=32000)


class ReplyOption(BaseModel):
    label: str
    content: str
    tone: Optional[str] = None


class AnalyzeResponse(BaseModel):
    summary: List[str] = Field(default_factory=list)
    suggestedReplies: List[ReplyOption] = Field(default_factory=list)
    processingTime: Optional[int] = None
    model: Optional[str] = None
