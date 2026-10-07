# ruff: noqa: B008
import json
import logging

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status
from sqlalchemy import select

from backend.api.dependencies import CurrentUser, DBSession
from backend.db.session import SessionLocal
from backend.models import Document, ProcessingStatus
from backend.schemas.document import DocumentDetail, DocumentResponse
from backend.services.document_processor import analyze_document
from backend.services.file_extractor import extract_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024

SUPPORTED_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def serialize_document_detail(document: Document) -> dict:
    return {
        "id": document.id,
        "filename": document.filename,
        "content_type": document.content_type,
        "file_size": document.file_size,
        "status": document.status,
        "error_message": document.error_message,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "analysis": json.loads(document.analysis) if document.analysis else None,
    }


def process_document(
    document_id: int,
    content: bytes,
    content_type: str,
) -> None:
    db = SessionLocal()

    try:
        document = db.get(Document, document_id)

        if document is None:
            logger.error(
                "Document not found for processing",
                extra={"document_id": document_id},
            )
            return

        logger.info(
            "Document processing started",
            extra={"document_id": document_id},
        )

        text = extract_text(content, content_type)

        if not text.strip():
            raise ValueError("Document contains no readable text")

        document.extracted_text = text

        analysis = analyze_document(text)

        document.analysis = analysis
        document.status = ProcessingStatus.COMPLETED
        document.error_message = None

        db.commit()

        logger.info(
            "Document processing completed",
            extra={"document_id": document_id},
        )

    except Exception:
        db.rollback()

        document = db.get(Document, document_id)

        if document is not None:
            document.status = ProcessingStatus.FAILED
            document.error_message = "Document processing failed"
            db.commit()

        logger.exception(
            "Document processing failed",
            extra={"document_id": document_id},
        )

    finally:
        db.close()


@router.post(
    "",
    response_model=DocumentDetail,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
) -> dict:
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type",
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds 10 MB limit",
        )

    document = Document(
        user_id=current_user.id,
        filename=file.filename or "document",
        content_type=file.content_type,
        file_size=len(content),
        status=ProcessingStatus.PROCESSING,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    background_tasks.add_task(
        process_document,
        document.id,
        content,
        file.content_type,
    )

    return serialize_document_detail(document)


@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_documents(
    current_user: CurrentUser,
    db: DBSession,
) -> list[Document]:
    result = db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )

    return list(result.scalars().all())


@router.get(
    "/{document_id}",
    response_model=DocumentDetail,
)
def get_document(
    document_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    document = db.get(Document, document_id)

    if document is None or document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return serialize_document_detail(document)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    document_id: int,
    current_user: CurrentUser,
    db: DBSession,
) -> None:
    document = db.get(Document, document_id)

    if document is None or document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    db.delete(document)
    db.commit()
