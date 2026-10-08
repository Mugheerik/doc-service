from io import BytesIO

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def register_and_login(email: str) -> str:
    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "password123",
        },
    )

    if login_response.status_code == 200:
        return login_response.json()["access_token"]

    register_response = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
        },
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": "password123",
        },
    )

    assert login_response.status_code == 200

    return login_response.json()["access_token"]


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_documents_require_authentication():
    response = client.get("/documents")

    assert response.status_code == 401


def test_upload_rejects_unsupported_file_type():
    response = client.post(
        "/documents",
        files={
            "file": (
                "test.exe",
                BytesIO(b"fake executable"),
                "application/octet-stream",
            )
        },
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401


def test_document_upload_list_get_and_delete(monkeypatch):
    token = register_and_login("documents-test@example.com")

    # Prevent the test from calling Gemini.
    def fake_process_document(
        document_id: int,
        content: bytes,
        content_type: str,
    ) -> None:
        return None

    monkeypatch.setattr(
        "backend.api.documents.process_document",
        fake_process_document,
    )

    headers = {"Authorization": f"Bearer {token}"}

    upload_response = client.post(
        "/documents",
        files={
            "file": (
                "test.txt",
                BytesIO(b"This is a test document."),
                "text/plain",
            )
        },
        headers=headers,
    )

    assert upload_response.status_code == 201

    document = upload_response.json()

    assert document["filename"] == "test.txt"
    assert document["content_type"] == "text/plain"
    assert document["file_size"] == len(b"This is a test document.")
    assert document["status"] == "PROCESSING"

    document_id = document["id"]

    list_response = client.get(
        "/documents",
        headers=headers,
    )

    assert list_response.status_code == 200

    documents = list_response.json()

    assert any(item["id"] == document_id for item in documents)

    detail_response = client.get(
        f"/documents/{document_id}",
        headers=headers,
    )

    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == document_id
    assert detail_response.json()["filename"] == "test.txt"

    delete_response = client.delete(
        f"/documents/{document_id}",
        headers=headers,
    )

    assert delete_response.status_code == 204

    deleted_response = client.get(
        f"/documents/{document_id}",
        headers=headers,
    )

    assert deleted_response.status_code == 404


def test_user_cannot_access_another_users_document(monkeypatch):
    owner_token = register_and_login("document-owner@example.com")
    other_user_token = register_and_login("document-other@example.com")

    # Prevent the test from calling Gemini.
    def fake_process_document(
        document_id: int,
        content: bytes,
        content_type: str,
    ) -> None:
        return None

    monkeypatch.setattr(
        "backend.api.documents.process_document",
        fake_process_document,
    )

    upload_response = client.post(
        "/documents",
        files={
            "file": (
                "private.txt",
                BytesIO(b"Private document"),
                "text/plain",
            )
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert upload_response.status_code == 201

    document_id = upload_response.json()["id"]

    response = client.get(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {other_user_token}"},
    )

    assert response.status_code == 404

    response = client.delete(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {other_user_token}"},
    )

    assert response.status_code == 404

    # Owner can still access the document.
    response = client.get(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 200

    # Clean up the test document.
    response = client.delete(
        f"/documents/{document_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 204
