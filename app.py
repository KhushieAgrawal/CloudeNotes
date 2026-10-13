import os
from datetime import datetime, timezone
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request, render_template
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy import or_
from werkzeug.security import check_password_hash, generate_password_hash
from db_ext import db

load_dotenv()


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-this-key"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///cloudnotes.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        TOKEN_MAX_AGE_SECONDS=8 * 60 * 60,
        MAX_CONTENT_LENGTH=1 * 1024 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    url = app.config["SQLALCHEMY_DATABASE_URI"]
    if url.startswith("postgres://"):
        app.config["SQLALCHEMY_DATABASE_URI"] = url.replace("postgres://", "postgresql://", 1)

    db.init_app(app)
    from models import User, Note

    with app.app_context():
        db.create_all()

    token_serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="cloudnotes-access-token")

    def error(message, status):
        return jsonify({"error": message}), status

    def issue_token(user):
        return token_serializer.dumps({"user_id": user.id})

    def current_user():
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        token = header[7:].strip()
        if not token:
            return None
        try:
            payload = token_serializer.loads(
                token, max_age=app.config["TOKEN_MAX_AGE_SECONDS"]
            )
        except (BadSignature, SignatureExpired):
            return None
        user_id = payload.get("user_id") if isinstance(payload, dict) else None
        return db.session.get(User, user_id) if isinstance(user_id, int) else None

    def login_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if current_user() is None:
                return error("Authentication required. Please log in again.", 401)
            return view(*args, **kwargs)
        return wrapped

    def body():
        data = request.get_json(silent=True)
        return data if isinstance(data, dict) else None

    def user_payload(user):
        return {"id": user.id, "username": user.username, "email": user.email}

    def serialize(note):
        return {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
        }

    # Page routes do not use server-side browser sessions. The frontend checks
    # sessionStorage and attaches the current tab's bearer token to API calls.
    @app.get("/")
    def home():
        return render_template("login.html")

    @app.get("/login")
    def login_page():
        return render_template("login.html")

    @app.get("/register")
    def register_page():
        return render_template("register.html")

    @app.get("/dashboard")
    def dashboard_page():
        return render_template("dashboard.html")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "CloudNotes API"})

    @app.post("/register")
    def register():
        data = body()
        if data is None:
            return error("Send JSON with username, email and password.", 400)
        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = data.get("password", "")
        if not username or not email or not isinstance(password, str):
            return error("Username, email and password are required.", 400)
        if len(username) > 50:
            return error("Username must be 50 characters or fewer.", 400)
        if len(email) > 254 or "@" not in email:
            return error("Enter a valid email address.", 400)
        if len(password) < 8 or len(password) > 128:
            return error("Password must be between 8 and 128 characters.", 400)
        existing = User.query.filter(
            or_(User.username.ilike(username), User.email.ilike(email))
        ).first()
        if existing:
            return error("That username or email is already registered.", 409)
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({
            "message": "Account created successfully.",
            "user": user_payload(user),
            "token": issue_token(user),
        }), 201

    @app.post("/login")
    def login():
        data = body()
        if data is None:
            return error("Send JSON with email and password.", 400)
        email = str(data.get("email", "")).strip().lower()
        password = data.get("password", "")
        if not email or not isinstance(password, str) or not password:
            return error("Email and password are required.", 400)
        user = User.query.filter_by(email=email).first()
        if user is None or not check_password_hash(user.password_hash, password):
            return error("Invalid email or password.", 401)
        return jsonify({
            "message": "Login successful.",
            "user": user_payload(user),
            "token": issue_token(user),
        })

    @app.post("/logout")
    def logout():
        # Access tokens are stateless. Clearing sessionStorage in this tab logs
        # this tab out; a token already copied elsewhere remains valid until expiry.
        return jsonify({"message": "Logged out successfully."})

    @app.get("/api/me")
    @login_required
    def me():
        return jsonify({"user": user_payload(current_user())})

    @app.get("/api/notes")
    @login_required
    def list_notes():
        user = current_user()
        term = request.args.get("search", "").strip()
        query = Note.query.filter_by(user_id=user.id)
        if term:
            pattern = f"%{term}%"
            query = query.filter(or_(Note.title.ilike(pattern), Note.content.ilike(pattern)))
        notes = query.order_by(Note.updated_at.desc(), Note.id.desc()).all()
        return jsonify({"notes": [serialize(note) for note in notes]})

    @app.post("/api/notes")
    @login_required
    def create_note():
        data = body()
        if data is None:
            return error("Send JSON with title and content.", 400)
        title = str(data.get("title", "")).strip()
        content = data.get("content", "")
        if not title:
            return error("Title is required.", 400)
        if len(title) > 200:
            return error("Title must be 200 characters or fewer.", 400)
        if not isinstance(content, str):
            return error("Content must be text.", 400)
        if len(content) > 50000:
            return error("Content must be 50,000 characters or fewer.", 400)
        note = Note(user_id=current_user().id, title=title, content=content)
        db.session.add(note)
        db.session.commit()
        return jsonify({"message": "Note created.", "note": serialize(note)}), 201

    @app.put("/api/notes/<int:note_id>")
    @login_required
    def update_note(note_id):
        user = current_user()
        note = Note.query.filter_by(id=note_id, user_id=user.id).first()
        if note is None:
            return error("Note not found.", 404)
        data = body()
        if data is None:
            return error("Send JSON with title and/or content.", 400)
        if "title" in data:
            title = str(data["title"]).strip()
            if not title:
                return error("Title cannot be empty.", 400)
            if len(title) > 200:
                return error("Title must be 200 characters or fewer.", 400)
            note.title = title
        if "content" in data:
            if not isinstance(data["content"], str):
                return error("Content must be text.", 400)
            if len(data["content"]) > 50000:
                return error("Content must be 50,000 characters or fewer.", 400)
            note.content = data["content"]
        note.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({"message": "Note updated.", "note": serialize(note)})

    @app.delete("/api/notes/<int:note_id>")
    @login_required
    def delete_note(note_id):
        note = Note.query.filter_by(id=note_id, user_id=current_user().id).first()
        if note is None:
            return error("Note not found.", 404)
        db.session.delete(note)
        db.session.commit()
        return jsonify({"message": "Note deleted."})

    @app.errorhandler(404)
    def not_found(_exc):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(413)
    def too_large(_exc):
        return jsonify({"error": "Request body is too large."}), 413

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
