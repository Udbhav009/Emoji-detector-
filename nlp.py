import spacy
import nltk
from nltk.tokenize import sent_tokenize

# load models
nlp = spacy.load("en_core_web_sm")
nltk.download('punkt')

def generate_questions(text):
    questions = []
    sentences = sent_tokenize(text)

    for sentence in sentences:
        doc = nlp(sentence)

        subject = ""
        verb = ""
        obj = ""

        # Extract subject, verb, object
        for token in doc:
            if token.dep_ == "nsubj":
                subject = token.text
            if token.pos_ == "VERB":
                verb = token.text
            if token.dep_ in ("attr", "dobj"):
                obj = token.text

        # Rule 1: WHO question
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                questions.append(f"Who {verb} {obj}?")

        # Rule 2: WHERE question
        for ent in doc.ents:
            if ent.label_ in ["GPE", "LOC"]:
                questions.append(f"Where {verb} {subject}?")

        # Rule 3: WHAT question (default)
        if subject and verb:
            questions.append(f"What {verb} {subject}?")

    return questions


# Example input
text = """
Ram is a student. He lives in Delhi. Python is a programming language.
"""

qs = generate_questions(text)

for q in qs:
    print(q)