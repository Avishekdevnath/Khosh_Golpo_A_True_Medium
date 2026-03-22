from app.core.config import Settings


def test_settings_accept_next_public_cloudinary_cloud_name_as_fallback(monkeypatch) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo-cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "demo-key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "demo-secret")

    settings = Settings(_env_file=None, jwt_secret_key="x" * 32)

    assert settings.cloudinary_cloud_name == "demo-cloud"
