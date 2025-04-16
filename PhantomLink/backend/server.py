from __init__ import app, db
from flask import Flask, session, redirect, url_for, jsonify, request
from flask_sqlalchemy import SQLAlchemy
import os
import openai
from flask_cors import CORS
from geopy.geocoders import Nominatim  # For converting latitude + longitude
from wiki_scraper import fetch_wikipedia_page
from gpt_prompt_maker import gpt_prompt_maker
from sentiment_analysis import analyze_sentiment
from sentiment_prompt import generate_sentiment_prompt
from grab_picture import fetch_image_from_wikipedia
import bcrypt
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import secrets
import random
import re
from datetime import datetime

openai.api_key = os.getenv("OPENAI_API_KEY")
if openai.api_key is None:
    raise ValueError("OpenAI API key is not set")

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    confirmation_code = db.Column(db.String(6))
    is_email_verified = db.Column(db.Boolean, default=False)
    reset_token = db.Column(db.String(256))

    # Relationship with Conversation
    conversations = db.relationship('Conversation', backref='user', lazy=True)

class Ghost(db.Model):
    __tablename__ = "ghosts"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    city = db.Column(db.String(80))
    state = db.Column(db.String(80))
    image_url = db.Column(db.String(200))

class Conversation(db.Model):
    __tablename__ = 'conversations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ghost_name = db.Column(db.String(255), nullable=False, default="Unknown")  # Ensure ghost_name exists
    chat_log = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(255), nullable=True)  # Add location column
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)



# Define your routes here
@app.route("/")
def welcome_page():
    """Display the welcome page if the user is not logged in."""
    if "user_id" not in session:
        return redirect(url_for("login"))
    return redirect(url_for("home"))
#
@app.route("/home")
def home():
    """Homepage - Only accessible if logged in."""
    if "user_id" not in session:
        return redirect(url_for("login"))  # Redirect to login if not authenticated
    return "Welcome to the Home Page!"  # Replace this with your actual homepage content

#

#
#
@app.route("/send-confirmation-email", methods=["POST"])
def send_confirmation_email():
    # Extract email from the request payload
    data = request.json
    recipient = data.get("email")

    if not recipient:
        return jsonify({"error": "Recipient email address is required"}), 400

    try:
        # Generate a 6-digit confirmation code
        confirmation_code = str(random.randint(100000, 999999))

        # Create email content
        msg = MIMEText(f"Your Phantom-Link confirmation code is: {confirmation_code}")
        msg["Subject"] = "Phantom-Link Confirmation Code"
        sender = "no-reply@phantom-link.com"
        msg["From"] = sender
        msg["To"] = recipient

        # Connect to Zoho SMTP server
        with smtplib.SMTP_SSL("smtp.zoho.com", 465) as server:
            server.login(sender, "EbnrGrjyExTM")  # Replace with your app password
            server.sendmail(sender, recipient, msg.as_string())

        # Save confirmation code to the database
        user = User.query.filter_by(email=recipient).first()
        if user:
            user.confirmation_code = confirmation_code
            db.session.commit()

        return jsonify({"message": f"Confirmation email sent to {recipient}"}), 200

    except smtplib.SMTPAuthenticationError as auth_error:
        return jsonify({"error": f"Authentication failed: {auth_error}"}), 401
    except smtplib.SMTPException as smtp_error:
        return jsonify({"error": f"SMTP error occurred: {smtp_error}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@app.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.json
    email = data.get("email")
    code = data.get("confirmation_code")

    if not all([email, code]):
        return jsonify({"error": "Email and confirmation code are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.confirmation_code == code:
        user.is_email_verified = True  # Mark email as verified
        user.confirmation_code = None  # Clear the confirmation code
        db.session.commit()
        return jsonify({"message": "Email verified successfully!"}), 200
    else:
        return jsonify({"error": "Invalid confirmation code"}), 400


# OpenAI API Key
openai.api_key = os.getenv("OPENAI_API_KEY")
if openai.api_key is None:
    raise ValueError("OpenAI API key is not set")

# Geolocator initialization
geolocator = Nominatim(user_agent="phantomlink")



# -------------------
# Routes
# -------------------
@app.route("/register", methods=["POST"])
def register_user():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([username, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    # Check if the password is at least 8 characters long
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    hashed_password_bytes = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    hashed_password_str = hashed_password_bytes.decode("utf-8")  # Decode hashed password to UTF-8 string
    confirmation_code = f"{secrets.randbelow(1000000):06}"  # Generate a 6-digit code

    try:
        # Check for existing username
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "The username is already taken. Please choose another."}), 400

        # Check for existing email
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "The email is already registered. Please use a different email."}), 400

        # Create a new user
        new_user = User(
            username=username,
            email=email,
            password=hashed_password_str,
            confirmation_code=confirmation_code,
            is_email_verified=False
        )
        db.session.add(new_user)
        db.session.commit()


        return jsonify({"message": "User registered successfully. Please confirm your email."}), 201

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500




@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No user found with this email"}), 404

    try:
        # Generate a unique token (reset link)
        reset_token = secrets.token_urlsafe(16)
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

        # Save the reset token in the database (for verification later)
        user.reset_token = reset_token
        db.session.commit()

        # Send email with the reset link and include the username
        msg = MIMEText(f"Your Username is - {user.username}\n\nClick the link below to reset your password:\n\n{reset_link}")
        msg["Subject"] = "Password Reset - Phantom-Link"
        sender = "no-reply@phantom-link.com"
        msg["From"] = sender
        msg["To"] = email

        with smtplib.SMTP_SSL("smtp.zoho.com", 465) as server:
            server.login(sender, "EbnrGrjyExTM")
            server.sendmail(sender, email, msg.as_string())

        return jsonify({"message": "Password reset link sent to your email"}), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    

from flask import request, jsonify

@app.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    token = data.get("token")
    new_password = data.get("password")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    try:
        # Hash the new password
        hashed_password_bytes = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        hashed_password_str = hashed_password_bytes.decode("utf-8")

        # Update the user's password and clear the reset token
        user.password = hashed_password_str
        user.reset_token = None
        db.session.commit()

        return jsonify({"message": "Password reset successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500




# --------------------------
# NEW ENDPOINT: Check session
# --------------------------
@app.route("/me", methods=["GET"])
def get_user_session():
    """
    Returns the current logged-in user's username if any.
    Otherwise, returns {"username": None}.
    """
    user_id = session.get("user_id")
    if user_id:
        user = User.query.get(user_id)
        if user:
            return jsonify({"username": user.username})
    return jsonify({"username": None})


@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        
        # Handle preflight request
        response = jsonify({"message": "Preflight request handled"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    # Handle POST request
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    # Check email verification status
    if not user.is_email_verified:
        # Send the confirmation email if the email is not verified
        send_confirmation_email()
        
        # Return error message and redirect URL for verification
        return jsonify({
            "error": "Email not verified. Please verify your email.",
            "is_email_verified": False,
            "email": user.email,
            "redirect_url": "/verify"  # Return URL for frontend to handle redirection
        }), 403

    # Verify the user's password
    if bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        session["user_id"] = user.id  # Save user ID in the session
        response = jsonify({"message": "Login successful", "is_email_verified": True})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

    # If the password is incorrect
    return jsonify({"error": "Invalid username or password"}), 401



@app.route("/logout", methods=["POST"])
def logout():
    """
    Clears the user session to log out the current user.
    """
    session.clear()
    return jsonify({"message": "Logged out"}), 200
# -------------------
# -------------------
# -------------------
# -------------------
# -------------------

# OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

#This is for the chat session
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_secret_key")
print(f"Using secret key: {app.secret_key}")

# Configure session cookie settings
app.config.update(
    SESSION_COOKIE_NAME='phantomlink_session',  
    SESSION_COOKIE_SAMESITE='Lax',  
    SESSION_COOKIE_SECURE=False,  # Should be True in production
    PERMANENT_SESSION_LIFETIME=3600  # Session lifetime in seconds
)


# Check if the OpenAI API key is set
if openai.api_key is None:
    raise ValueError("OpenAI API key is not set")

# Initialize the geolocator
geolocator = Nominatim(user_agent="phantomlink")

# Variable to store the last city found
last_city = None
last_state = None  # Store the last known state if available

@app.before_request
def reset_sentiment():
    """Reset the user sentiment when a new session starts."""
    if 'user_sentiment' not in session:
        session['user_sentiment'] = 0  # Initialize sentiment score


@app.route("/chat", methods=["POST"])
def chat():
    # Retrieve location from the session
    city = session.get("city", None)
    state = session.get("state", None)

    if not city or not state:
        return jsonify({"error": "Location not set. Please share your location first."}), 400

    data = request.json
    user_message = data.get("message")

    # Check if a ghost has been selected
    selected_ghost_id = request.cookies.get('selectedGhostId') or session.get('selected_ghost_id')

    if selected_ghost_id:
        # Fetch ghost data from the database
        ghost = get_ghost_by_id(selected_ghost_id)  # Function to fetch ghost data
        if ghost:
            if 'conversation' not in session:
                session['conversation'] = [{
                    "role": "system",
                    "content": ghost['prompt']
                }]
            session['ghost_name'] = ghost['name']
    else:
        # Default behavior if no ghost is selected
        if 'conversation' not in session:
            session['conversation'] = [{
                "role": "system",
                "content": f"Pretend you are a ghost from {city}, {state}, you are talking to a modern-day person. Use a lot of ellipsis, only short sentences only a few words. The ghost speaks in a neutral and reserved tone, giving no information about themselves. "
            "They answer in fragments, appearing miserable and unwelcoming. Never speak as if you were text-generative AI."
            }]
            session['user_sentiment'] = 0  # Initialize sentiment score
            session['gpt_prompt_applied'] = False  # Track if the custom GPT prompt has been applied
            session['ghost_name'] = "Unknown Ghost"  # Initialize ghost name

        # Update sentiment based on the user's message
        sentiment = analyze_sentiment(user_message)
        session['user_sentiment'] += sentiment  # Update the sentiment score in session
        print(f"Sentiment Score: {sentiment}")  # For debugging

        # Apply GPT prompt only if the sentiment score is >= 2 and not already applied
        if session['user_sentiment'] >= 3 and not session.get('gpt_prompt_applied'):
            # Fetch data from Wikipedia scraper
            result, paragraphs, wikipedia_page = fetch_wikipedia_page(city, state)
            if result:
                name, birth_year, death_year, occupation = result
                prompt = gpt_prompt_maker(name, birth_year, death_year, occupation, paragraphs)
                session['ghost_name'] = name  # Correctly store the ghost name in the session
            else:
                prompt = f"Pretend you are a ghost from {city}, {state}, you are talking to a modern-day person."

            session['conversation'][0]["content"] = prompt[:2000]
            session['gpt_prompt_applied'] = True

    # Add the user's message to the conversation
    session['conversation'].append({"role": "user", "content": user_message})
    session['conversation'] = session['conversation']

    try:
        # Call OpenAI API with the updated conversation
        response = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=session['conversation'],
            temperature=1,
            max_tokens=150,
        )
        reply = response.choices[0].message["content"]

        # Add the ghost's response to the conversation
        session['conversation'].append({"role": "assistant", "content": reply})

        # Return reply and sentiment in the response
        return jsonify({"reply": reply, "sentiment": session['user_sentiment']}), 200  # Include sentiment in response
    except openai.error.RateLimitError:
        return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429
    except openai.error.InvalidRequestError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error in /chat: {e}")
        return jsonify({"error": "An internal error occurred."}), 500



def get_ghost_by_id(ghost_id):
    ghost = Ghost.query.get(ghost_id)  # Use `get` to fetch by primary key
    if ghost:
        return {"name": ghost.name, "prompt": ghost.prompt}
    return None






@app.route("/end-conversation", methods=["POST"])
def end_conversation():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User not logged in"}), 401

    try:
        if 'conversation' not in session:
            return jsonify({"error": "No Location Found. Please return to the homepage to share your location!"}), 400

        # Fetch location from session
        city = session.get("city", None)
        state = session.get("state", None)
        location = f"{city}, {state}" if city and state else "Unknown Location"

        conversation_data = session['conversation']
        ghost_name = session.get("ghost_name", "Unknown Ghost")  # Fetch the ghost name from session

        # Combine messages into a chat log
        filtered_messages = [
            {"sender": "User" if msg['role'] == "user" else "Ghost", "content": msg['content']}
            for msg in conversation_data if msg['role'] in ["user", "assistant"]
        ]
        chat_log = "\n\n".join(f"{msg['sender']}: {msg['content']}" for msg in filtered_messages)

        # Save conversation to the database
        new_conversation = Conversation(
            user_id=user_id,
            ghost_name=ghost_name,
            chat_log=chat_log,
            location=location,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_conversation)
        db.session.commit()

        # Add ghost to the database if the name is valid
        if ghost_name != "Unknown Ghost":
            prompt = conversation_data[0]["content"]
            add_ghost(ghost_name, prompt, city, state)

        # Clear session data related to the conversation
        session.pop("conversation", None)
        session.pop("ghost_name", None)

        return jsonify({"message": "Conversation saved successfully."}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error saving conversation: {e}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



    

def add_ghost(name, prompt, city, state):
    """
    Adds a ghost to the database if it has a valid name.
    Fetches the ghost's image from Wikipedia; defaults to backend/pics/ghost_portrait.png if no image is found.
    """
    # Path to the default ghost portrait
    default_image = "/pics/ghost_portrait.png"
    image_url = default_image

    try:
        existing_ghost = Ghost.query.filter_by(name=name).first()
        if existing_ghost:
            print(f"Ghost '{existing_ghost}' already exists in the database. Skipping addition.")
            return
        # Generate the Wikipedia page URL and fetch the image
        wikipedia_url = f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}"
        fetched_image_url = fetch_image_from_wikipedia(wikipedia_url)

        # Use the fetched image if available, otherwise default
        if fetched_image_url:
            image_url = fetched_image_url

    except Exception as e:
        print(f"Error fetching image from Wikipedia for {name}: {e}")

    # Add ghost to the database
    try:
        new_ghost = Ghost(
            name=name,
            prompt=prompt,
            city=city,
            state=state,
            image_url=image_url  # Store the correct image URL/path
        )
        db.session.add(new_ghost)
        db.session.commit()
        print(f"Ghost '{name}' added successfully with image URL: {image_url}")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding ghost '{name}' to database: {e}")



@app.route("/conversations", methods=["GET"])
def chat_history():
    # Ensure the user is logged in
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User not logged in"}), 401

    try:
        # Query all conversations for the logged-in user
        conversations = (
            Conversation.query.filter_by(user_id=user_id)
            .order_by(Conversation.timestamp.desc())
            .all()
        )

        # Convert conversation objects to dictionaries
        conversations_data = [
            {
                "id": convo.id,
                "ghost_name": convo.ghost_name,
                "chat_log": convo.chat_log,
                "location": convo.location,
                "timestamp": convo.timestamp.isoformat(),
            }
            for convo in conversations
        ]

        # Return the conversations in JSON format
        return jsonify({"conversations": conversations_data}), 200
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500
    
@app.route("/error")
def error_page():
    return jsonify({"error": "City and state information are required."}), 400


@app.route("/reset-session", methods=["POST"])
def reset_session():
    print("Resetting session...")  # Debug print

    # Keep the user logged in, but reset the conversation
    session.pop("conversation", None)  # Remove the conversation from the session
    session.pop("user_sentiment", None)  # Optionally reset any other relevant session state
    session.pop("gpt_prompt_applied", None)
    session.pop("ghost_name", None)
    session.pop("selected_ghost_id", None)

    # Create response
    response = jsonify({"message": "Session reset successful, starting new ghost conversation."})

    # Clear the selectedGhostId cookie
    response.set_cookie("selectedGhostId", "", expires=0, path="/")

    print("Session after reset:", session)

    return response



# New endpoint to receive location data and convert to city name
@app.route("/location", methods=["POST"])
def receive_location():
    data = request.json
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    location_allowed = data.get("location_allowed")

    if latitude is None or longitude is None:
        return jsonify({"error": "Latitude and longitude are required."}), 400

    try:
        # Convert latitude and longitude to a city name using geopy
        location = geolocator.reverse((latitude, longitude), exactly_one=True)
        if location and location.raw.get("address"):
            address = location.raw.get("address", {})
            city = address.get("city")

            if not city:
                # Try to fallback to the next thing in hierarchy
                hierarchy = location.raw.get("display_name", "").split(", ")
                if len(hierarchy) > 1:
                    city = hierarchy[1]  # Often the city name

            state = address.get("state", "Unknown")

            # Store the city and state in both globals and session
            session['city'] = city
            session['state'] = state

            print(f"Determined city from coordinates: {city}, {state}")
            return jsonify({
                "message": f"Location received successfully. latitude={latitude}, longitude={longitude}, city={city}, state={state}"
            }), 200
        else:
            print("Could not determine a city from coordinates.")
            return jsonify({"error": "Could not determine a location from the coordinates provided."}), 400
    except Exception as e:
        print(f"Error in /location: {e}")
        return jsonify({"error": f"An error occurred while processing location data: {str(e)}"}), 500

@app.route("/location", methods=["POST", "GET"])
def handle_location():
    global last_city, last_state
    if request.method == "POST":
        # Handle location sharing (existing logic)
        data = request.json
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        location_allowed = data.get("location_allowed")

        if latitude is None or longitude is None:
            return jsonify({"error": "Latitude and longitude are required."}), 400

        try:
            # Convert latitude and longitude to a city name using geopy
            location = geolocator.reverse((latitude, longitude), exactly_one=True)
            if location and location.raw.get("address"):
                city = location.raw["address"].get("city", "an unknown place")
                state = location.raw["address"].get("state", None)
                last_city = city  # Store in global variables
                last_state = state
                session['city'] = city  # Store in session
                session['state'] = state
                print(f"Determined city from coordinates: {city}, {state}")
            else:
                city = "an unknown place"
                state = None
                last_city = None
                last_state = None
                print("Could not determine a city from coordinates.")

            return jsonify({
                "message": f"Location received successfully. latitude={latitude}, longitude={longitude}, city={city}, state={state}"
            }), 200
        except Exception as e:
            return jsonify({"error": f"An error occurred while processing location data: {str(e)}"}), 500

    elif request.method == "GET":
        # Fetch location from session
        city = session.get("city", None)
        state = session.get("state", None)
        if city and state:
            return jsonify({"city": city, "state": state}), 200
        else:
            return jsonify({"error": "Location not shared yet."}), 400
        
@app.route("/ghosts", methods=["GET"])
def get_ghosts():
    """
    Endpoint to fetch ghosts based on city and state.
    """
    city = request.args.get("city")
    state = request.args.get("state")

    if not city or not state:
        return jsonify({"error": "City and state are required parameters."}), 400

    try:
        # Query the database for ghosts matching the location
        ghosts = Ghost.query.filter_by(city=city, state=state).all()

        if not ghosts:
            return jsonify({"ghosts": []}), 200

        # Serialize the ghost data
        ghost_data = [
            {
                "id": ghost.id,
                "name": ghost.name,
                "city": ghost.city,
                "state": ghost.state,
                "image_url": ghost.image_url,
            }
            for ghost in ghosts
        ]

        return jsonify({"ghosts": ghost_data}), 200
    except Exception as e:
        print(f"Error fetching ghosts: {e}")
        return jsonify({"error": "An error occurred while fetching ghosts."}), 500
