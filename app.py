from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
import numpy as np
import os

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# ── Emoji knowledge base ──────────────────────────────────────────────────────
# Each entry: (emoji, short label, rich semantic description)
EMOJI_DATA = [
    # ❤ Emotions & feelings
    ("❤️",  "Love",         "love heart romance passion affection deep feeling soulmate forever together"),
    ("😍",  "Adore",        "adore amazed infatuated heart eyes beautiful stunning gorgeous wow"),
    ("😊",  "Happy",        "happy smile joy content cheerful pleased delighted warm friendly"),
    ("😂",  "Laughing",     "laughing hilarious funny lol tears humor joke comedy rofl"),
    ("🥹",  "Touched",      "touched moved emotional teary grateful overwhelmed wholesome bittersweet"),
    ("😭",  "Crying",       "crying sad tears sobbing heartbroken devastated miserable upset"),
    ("😢",  "Sad",          "sad unhappy sorrow grief disappointed hurt pain lonely regret"),
    ("😡",  "Angry",        "angry furious mad rage irritated frustrated enraged infuriated"),
    ("😤",  "Determined",   "determined stubborn defiant huffy snorting steam strong-willed"),
    ("😰",  "Anxious",      "anxious nervous worried scared fear sweat panic dread uneasy"),
    ("😱",  "Shocked",      "shocked screaming terrified horror scared omg unbelievable startled"),
    ("🤩",  "Excited",      "excited starstruck amazing awesome thrilled euphoric psyched pumped"),
    ("🥳",  "Party",        "party celebrate birthday woohoo festive cheers congratulations confetti"),
    ("😴",  "Sleepy",       "sleepy tired exhausted drowsy zzz rest nap bedtime fatigue"),
    ("🤔",  "Thinking",     "thinking pondering wondering curious reflecting brainstorming contemplating"),
    ("😏",  "Smirk",        "smirk sly confident flirty mischievous knowing wink cheeky"),
    ("🙄",  "Eye-roll",     "eye-roll bored unimpressed annoyed whatever duh obviously sarcasm"),
    ("😬",  "Awkward",      "awkward cringe embarrassed uncomfortable nervous grimace oops"),
    ("🥺",  "Pleading",     "pleading puppy eyes begging please adorable vulnerable longing desperate cute"),
    ("😎",  "Cool",         "cool sunglasses awesome boss swagger confident chill badass"),
    ("🤯",  "Mind blown",   "mind blown shocked amazed unbelievable wow speechless overwhelmed"),
    ("😷",  "Sick",         "sick ill unwell covid mask flu cold virus health"),
    ("🤢",  "Nauseated",    "nauseated disgusted gross vomit eww queasy awful horrible"),
    ("🥰",  "Beloved",      "beloved cherished smiling hearts love affectionate warmth smitten"),
    ("😆",  "Grinning",     "grinning satisfied laughing squinting pleased giggling chuckling"),
    ("😜",  "Playful",      "playful silly winking tongue fun goofy crazy wild"),
    ("🫠",  "Melting",      "melting overwhelmed exhausted flustered too much losing it"),
    ("🫶",  "Heart hands",  "heart hands love kindness support unity together solidarity"),
    ("🙏",  "Grateful",     "grateful thankful pray please beg hope wish blessed namaste"),

    # 🎉 Events & activities
    ("🎉",  "Celebration",  "celebration party event success achievement congratulations milestone"),
    ("🎂",  "Birthday",     "birthday cake celebration anniversary candles party special day"),
    ("🏆",  "Trophy",       "trophy winner champion victory achievement first place gold award"),
    ("🎯",  "Target",       "target goal aim success bullseye precision focus achievement"),
    ("🚀",  "Launch",       "launch rocket startup take-off blast success fast speed sky"),
    ("💡",  "Idea",         "idea lightbulb innovation creative inspiration insight discovery"),
    ("📚",  "Study",        "study book learning education reading school university knowledge"),
    ("💻",  "Coding",       "coding laptop computer programming developer software tech work"),
    ("🎮",  "Gaming",       "gaming play video game controller fun leisure entertainment"),
    ("🎵",  "Music",        "music song melody listen audio beat rhythm concert vibe"),
    ("🎨",  "Art",          "art painting creative design drawing artist color craft"),
    ("📸",  "Photo",        "photo camera picture photography capture selfie image snapshot"),
    ("✈️",  "Travel",       "travel flight airplane trip journey adventure vacation destination"),
    ("🏖️", "Beach",        "beach vacation sun sand surf tropical relax holiday ocean"),
    ("⛰️",  "Mountain",     "mountain hiking adventure trekking outdoors peak summit nature"),
    ("🏋️", "Workout",      "workout gym fitness exercise strong training muscles health"),
    ("🧘",  "Meditation",   "meditation yoga calm peace mindfulness relax serene zen breathe"),
    ("🛒",  "Shopping",     "shopping cart buy purchase store sale deals retail"),
    ("💸",  "Money",        "money cash spend rich wealth expensive bills financial"),
    ("💰",  "Rich",         "rich wealthy savings profit earn income jackpot treasure gold"),

    # 🍕 Food & drink
    ("☕",  "Coffee",       "coffee morning espresso caffeine brew hot drink cozy café"),
    ("🍕",  "Pizza",        "pizza cheese delicious slice dinner yummy food favourite"),
    ("🍣",  "Sushi",        "sushi japanese food fish rice restaurant dinner fresh"),
    ("🍔",  "Burger",       "burger hamburger fast food meal lunch dinner juicy"),
    ("🍺",  "Beer",         "beer drink cheers pub happy hour celebration chill relax"),
    ("🍷",  "Wine",         "wine red white glass dinner romantic fancy evening"),
    ("🧁",  "Cupcake",      "cupcake dessert sweet bake celebrate party sugar icing"),
    ("🍦",  "Ice cream",    "ice cream dessert sweet summer treat cold yummy"),
    ("🥗",  "Salad",        "salad healthy green diet vegetable fresh lunch vegan"),
    ("🍜",  "Noodles",      "noodles ramen pasta soup warm comforting dinner meal"),

    # 🌿 Nature & weather
    ("🌸",  "Blossom",      "blossom spring flower beautiful pink cherry sakura bloom fresh"),
    ("🌊",  "Ocean",        "ocean wave sea water vast powerful nature beach surf"),
    ("🌙",  "Moon",         "moon night evening starry dark midnight sky peaceful sleep"),
    ("☀️",  "Sunshine",     "sunshine sunny bright warm summer morning cheerful glow"),
    ("⛈️",  "Storm",        "storm thunder lightning dark dramatic intense power"),
    ("❄️",  "Snow",         "snow cold winter ice freeze chill frost seasonal"),
    ("🌈",  "Rainbow",      "rainbow colorful hope beautiful after rain diversity joy"),
    ("🌺",  "Flower",       "flower floral garden nature beauty bloom tropical"),
    ("🐶",  "Dog",          "dog puppy pet loyal cute furry companion animal"),
    ("🐱",  "Cat",          "cat kitten pet cute furry independent playful animal"),
    ("🦋",  "Butterfly",    "butterfly transformation change grace beauty flutter delicate"),
    ("🌴",  "Palm tree",    "palm tree tropical vacation summer beach resort relaxation"),

    # 💪 Motivation & work
    ("💪",  "Strong",       "strong power muscle determined motivate hustle grind resilient"),
    ("🔥",  "Fire",         "fire hot trend viral lit amazing streak burning intense"),
    ("⚡",  "Energy",       "energy fast lightning electric power charged zoom quick"),
    ("✅",  "Done",         "done completed checked finished accomplished task success tick"),
    ("❌",  "Wrong",        "wrong error no fail cancel stop reject mistake"),
    ("⚠️",  "Warning",      "warning caution alert careful danger risk attention"),
    ("🔑",  "Key",          "key unlock solution answer access secret important critical"),
    ("📊",  "Chart",        "chart data statistics analysis report growth progress metrics"),
    ("🗓️",  "Calendar",     "calendar schedule plan meeting deadline date appointment"),
    ("📧",  "Email",        "email message send inbox communication reply contact"),

    # 🌐 Social & misc
    ("👍",  "Thumbs up",    "thumbs up agree good like yes approve great awesome"),
    ("👎",  "Thumbs down",  "thumbs down disagree bad dislike no reject disapprove"),
    ("👋",  "Wave",         "wave hello goodbye greet meet hi bye farewell"),
    ("🤝",  "Handshake",    "handshake deal agreement partner collaborate team trust"),
    ("👀",  "Eyes",         "eyes watching look see observe notice spotted reading"),
    ("💬",  "Chat",         "chat talk message conversation discuss communicate words"),
    ("🔗",  "Link",         "link connect share resource url reference website"),
    ("🛠️",  "Tools",        "tools fix build create construct engineer work repair"),
    ("🧠",  "Brain",        "brain smart intelligence think knowledge cognitive genius learning"),
    ("🎁",  "Gift",         "gift present surprise wrap special occasion giving generous"),
    ("🌍",  "World",        "world global earth planet humanity international together"),
    ("🏠",  "Home",         "home house family cozy comfortable safe warmth domestic"),
    ("🚗",  "Car",          "car drive road trip commute vehicle transport fast"),
    ("📱",  "Phone",        "phone mobile call text message screen app notification"),
    ("🎓",  "Graduate",     "graduate degree university college education success academic"),
    ("🩺",  "Doctor",       "doctor health medical hospital care patient nurse medicine"),
    ("💊",  "Medicine",     "medicine pill treatment drug health sick recover pharmacy"),
    ("🧪",  "Science",      "science experiment research lab chemistry biology discovery"),
    ("🤖",  "Robot",        "robot AI artificial intelligence technology automation future"),
    ("👾",  "Alien",        "alien weird strange extraterrestrial odd out of this world"),
]

print("🔄 Loading sentence-transformer model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Model loaded!")

# Pre-compute emoji description embeddings
emoji_texts = [desc for (_, _, desc) in EMOJI_DATA]
emoji_embeddings = model.encode(emoji_texts, convert_to_tensor=True, show_progress_bar=False)
print(f"✅ Encoded {len(EMOJI_DATA)} emoji descriptions")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = (data or {}).get("text", "").strip()
    top_k = int((data or {}).get("top_k", 8))

    if not text:
        return jsonify({"emojis": []})

    # Encode user text
    query_embedding = model.encode(text, convert_to_tensor=True)

    # Cosine similarity with all emoji descriptions
    scores = util.cos_sim(query_embedding, emoji_embeddings)[0].cpu().numpy()

    # Top-k indices
    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for idx in top_indices:
        emoji, label, _ = EMOJI_DATA[idx]
        confidence = float(scores[idx])
        # Normalise confidence to 0-100 range (scores typically 0.1-0.8)
        pct = round(min(max((confidence - 0.05) / 0.75, 0), 1) * 100, 1)
        results.append({"emoji": emoji, "label": label, "score": confidence, "pct": pct})

    return jsonify({"emojis": results, "input": text})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, port=5050)
