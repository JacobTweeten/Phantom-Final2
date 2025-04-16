from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import secrets

# Initialize SQLAlchemy (without passing `app` yet)
db = SQLAlchemy()

def create_app():
    """Factory function to create the Flask app instance."""
    app = Flask(__name__)

    # Load configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(16))

    # Ensure DB URI is set
    if not app.config["SQLALCHEMY_DATABASE_URI"]:
        raise RuntimeError("ERROR: SQLALCHEMY_DATABASE_URI is not set!")

    allowed_origins = [
    "http://phantom-link.com",
    "https://phantom-link.com",
    "http://www.phantom-link.com",
    "https://www.phantom-link.com"
    ]
    # Enable CORS
    CORS(app, supports_credentials=True, resources={
        r"/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    # Initialize database with the app
    db.init_app(app)

    return app

# Create app instance
app = create_app()
