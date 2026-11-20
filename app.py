
from flask import Flask, render_template, request, jsonify, session
from transformers import pipeline  # pyright: ignore[reportMissingImports]
import torch  # pyright: ignore[reportMissingImports]
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "sentiment-ai-development-key")

# Load the pretrained DistilBERT model
print("Loading DistilBERT model... Please wait.")

MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"

device = 0 if torch.cuda.is_available() else -1

sentiment_model = pipeline(
    "sentiment-analysis",
    model=MODEL_NAME,
    tokenizer=MODEL_NAME,
    device=device
)

print("DistilBERT model loaded successfully!")


def format_sentiment(label):
    label = label.lower()

    if "positive" in label:
        return "Positive"

    if "negative" in label:
        return "Negative"

    if "neutral" in label:
        return "Neutral"

    return label.capitalize()


@app.route("/")
def home():
    if "history" not in session:
        session["history"] = []

    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()

        if not text:
            return jsonify({
                "success": False,
                "error": "Please enter some text to analyze."
            }), 400

        if len(text) > 2000:
            return jsonify({
                "success": False,
                "error": "Please enter text under 2000 characters."
            }), 400

        result = sentiment_model(text[:512])[0]

        sentiment = format_sentiment(result["label"])
        confidence = round(float(result["score"]) * 100, 2)

        history = session.get("history", [])

        history.insert(0, {
            "text": text[:150],
            "sentiment": sentiment,
            "confidence": confidence,
            "time": datetime.now().strftime("%I:%M %p")
        })

        session["history"] = history[:20]

        return jsonify({
            "success": True,
            "text": text,
            "sentiment": sentiment,
            "confidence": confidence,
            "label": result["label"]
        })

    except Exception as e:
        app.logger.exception("Analysis failed")
        return jsonify({
            "success": False,
            "error": "Analysis failed. Please try again."
        }), 500


@app.route("/history")
def get_history():
    return jsonify(session.get("history", []))


@app.route("/clear-history", methods=["POST"])
def clear_history():
    session["history"] = []
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
