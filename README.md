# Context-Aware Emoji Predictor

A web application that uses Natural Language Processing (NLP) to recommend the most relevant emojis based on the semantic meaning of your text. Unlike simple keyword matching, this tool understands the context and sentiment of your sentences using advanced sentence embeddings.

## Features

- **Semantic Emoji Prediction**: Uses Sentence Transformers (`all-MiniLM-L6-v2`) to accurately map the meaning of your input text to a curated database of emojis.
- **Compose Modal**: Write custom text, insert predicted emojis directly into your message via an interactive palette, and export the final composition as a `.txt` file or copy it to the clipboard.
- **Real-time Interface**: Modern, responsive, and interactive frontend built with HTML, CSS (featuring modern glassmorphism design), and Vanilla JavaScript.
- **RESTful API**: A lightweight Flask backend that efficiently processes text and returns emoji predictions with confidence scores.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python, Flask, Flask-CORS
- **Machine Learning**: `sentence-transformers`, `numpy`, PyTorch

## Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd emoji_predictor
   ```

2. **Set up a Python virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install the required dependencies**:
   Make sure you have `pip` installed, then run:
   ```bash
   pip install flask flask-cors sentence-transformers numpy
   ```

## Usage

1. **Start the Flask server**:
   ```bash
   python app.py
   ```
   *Note: The first time you run this, it may take a moment to download the pre-trained `all-MiniLM-L6-v2` model.*

2. **Access the Web Interface**:
   Open your web browser and go to:
   ```
   http://localhost:5050
   ```

3. **Predict Emojis**:
   - Type your sentence into the main text area.
   - The application will process your text and display the top recommended emojis along with their confidence scores.
   - Use the **Compose** feature to build a message with the predicted emojis and export it!

## Project Structure

- `app.py`: The main Flask server and NLP inference logic.
- `index.html`: The main structural entry point for the frontend.
- `static/styles.css`: Contains all the styling and animations for the UI.
- `static/app.js`: Handles frontend logic, API calls, and DOM manipulation.

## License

This project is open-source and available under the MIT License.
