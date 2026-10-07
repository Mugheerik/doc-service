from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.models.document import ProcessingStatus


class ImportantEntity(BaseModel):
    name: str
    type: str
    value: str


class DocumentAnalysis(BaseModel):
    summary: str
    key_points: list[str]
    document_type: str
    important_entities: list[ImportantEntity]
    action_items: list[str]


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str
    file_size: int
    status: ProcessingStatus
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentResponse):
    analysis: DocumentAnalysis | None = None
