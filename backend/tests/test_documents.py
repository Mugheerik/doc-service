from io import BytesIO

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


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


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
