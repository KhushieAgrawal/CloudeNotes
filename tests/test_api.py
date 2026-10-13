import pytest
from app import create_app
from db_ext import db

@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test_cloudnotes.db"
    app = create_app({"TESTING": True, "SECRET_KEY": "test-secret-key",
                      "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_file.as_posix()}",
                      "SESSION_COOKIE_SECURE": False})
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.session.remove()
        db.drop_all()

def register(client, username="alice", email="alice@example.com", password="securepass123"):
    return client.post("/register", json={"username": username, "email": email, "password": password})

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json["status"] == "ok"

def test_registration_hashes_password(client):
    assert register(client).status_code == 201
    from models import User
    with client.application.app_context():
        user = User.query.filter_by(email="alice@example.com").first()
        assert user and user.password_hash != "securepass123"

def test_duplicate_email_rejected(client):
    assert register(client).status_code == 201
    assert register(client, username="alice2").status_code == 409

def test_notes_require_login(client):
    assert client.get("/api/notes").status_code == 401

def test_note_crud_and_search(client):
    assert register(client).status_code == 201
    r = client.post("/api/notes", json={"title": "Cloud deployment", "content": "Flask and PostgreSQL"})
    assert r.status_code == 201
    note_id = r.json["note"]["id"]
    assert len(client.get("/api/notes?search=PostgreSQL").json["notes"]) == 1
    assert client.put(f"/api/notes/{note_id}", json={"title": "Updated"}).status_code == 200
    assert client.delete(f"/api/notes/{note_id}").status_code == 200
    assert client.get("/api/notes").json["notes"] == []

def test_user_cannot_access_another_users_note(client):
    assert register(client).status_code == 201
    note = client.post("/api/notes", json={"title": "Private", "content": "Alice's note"})
    note_id = note.json["note"]["id"]
    client.post("/logout")
    assert register(client, "bob", "bob@example.com").status_code == 201
    assert client.put(f"/api/notes/{note_id}", json={"title": "Stolen"}).status_code == 404
    assert client.delete(f"/api/notes/{note_id}").status_code == 404
    assert client.get("/api/notes").json["notes"] == []

def test_short_password_rejected(client):
    assert register(client, password="short").status_code == 400
