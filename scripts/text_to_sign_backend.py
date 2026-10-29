"""
Text to Sign Backend Service and ISL Tokenizer
Ported & adapted from Sign-Flow (https://github.com/maddyroxx/Sign-Flow)
License: MIT (Copyright (c) 2026 Madhav Mullick)

Provides:
- In-memory LRU caching
- Input validation (empty, max length, sanitization)
- Deterministic ISL rule engine (contractions, lemmatization, SOV / WH-last grammar)
- Optional Gemini API online translation via GEMINI_API_KEY
- Structured token generation: { word, sign_id, type: "sign"|"fingerspell", duration }
"""

import json
import os
import re
import urllib.request
import urllib.error
from collections import OrderedDict
from typing import Dict, Any, List, Optional, Tuple

MAX_CACHE_SIZE = int(os.environ.get("SIGN_CACHE_SIZE", os.environ.get("SIGNFLOW_CACHE_SIZE", "200")))
_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()

SUPPORTED_TOKENS = [
    'AGAIN', 'AGE', 'ANGRY', 'ANSWER', 'ANSWERED', 'ANSWERING', 'ASK', 'ASKED', 'ASKING', 'ATE',
    'BAD', 'BAG', 'BECAUSE', 'BEGAN', 'BEGIN', 'BEGINNING', 'BEGUN', 'BELIEVE', 'BELIEVED', 'BELIEVING',
    'BOOK', 'BOOKS', 'BOY', 'BREAD', 'BREAKFAST', 'BRING', 'BRINGING', 'BROTHER', 'BROUGHT', 'BUS',
    'CAR', 'CHAIR', 'CHANGE', 'CHANGED', 'CHANGING', 'CHILD', 'CITY', 'CLASS', 'CLASSES', 'CLOSE',
    'CLOTHES', 'COFFEE', 'COLLEGE', 'COLLEGES', 'COME', 'COME_IN', 'COMING', 'COMPUTER', 'COMPUTERS', 'CONFUSED',
    'DANGER', 'DID', 'DINNER', 'DO', 'DOCTOR', 'DOCTORS', 'DOING', 'DONE', 'DOOR', 'DRANK',
    'DRINK', 'DRINKING', 'DRINKS', 'EARLY', 'EAT', 'EATING', 'EMERGENCY', 'EXAM', 'FAMILY', 'FATHER',
    'FEEL', 'FEELING', 'FELT', 'FINISH', 'FINISHED', 'FINISHING', 'FOOD', 'FORGET', 'FORGETTING', 'FORGOT',
    'FORGOTTEN', 'FRIEND', 'FRUIT', 'GAVE', 'GIRL', 'GIVE', 'GIVING', 'GO', 'GOING', 'GOOD',
    'GO_OUT', 'HAPPY', 'HELLO', 'HELP', 'HELPING', 'HOME', 'HOMES', 'HOSPITAL', 'HOUSE', 'HOW',
    'HOW_MANY', 'HOW_MUCH', 'I', 'IMPORTANT', 'KEEP', 'KEEPING', 'KEPT', 'KEY', 'KNEW', 'KNOW',
    'KNOWING', 'LATE', 'LEARN', 'LEARNED', 'LEARNING', 'LIKE', 'LIKED', 'LIKING', 'LISTEN', 'LISTENED',
    'LISTENING', 'LIVE', 'LIVED', 'LIVING', 'LOOK', 'LOOKED', 'LOOKING', 'LOVE', 'LOVED', 'LOVES',
    'LOVING', 'LUNCH', 'MADE', 'MAKE', 'MAKING', 'MAN', 'MARKET', 'ME', 'MEET', 'MEETING',
    'MEETS', 'MET', 'MILK', 'MINE', 'MOBILE', 'MOBILES', 'MONEY', 'MORNING', 'MOTHER', 'MY',
    'MYSELF', 'NAME', 'NEED', 'NEEDING', 'NEED_HELP', 'NEIGHBOR', 'NO', 'OFFICE', 'OPEN', 'PAIN',
    'PARENT', 'PARK', 'PERSON', 'PHONE', 'PHONES', 'PLAY', 'PLAYED', 'PLAYING', 'PLEASE', 'POLICE',
    'PROJECT', 'PROJECTS', 'QUESTION', 'QUESTIONS', 'RAN', 'READ', 'READING', 'READY', 'RECEIVE', 'RECEIVED',
    'RECEIVING', 'REMEMBER', 'REMEMBERED', 'REMEMBERING', 'RICE', 'ROAD', 'ROOM', 'RUN', 'RUNNING', 'SAD',
    'SAFE', 'SAT', 'SAW', 'SCARED', 'SCHOOL', 'SCHOOLS', 'SEE', 'SEEING', 'SEND', 'SENDING',
    'SENT', 'SHOP', 'SHOW', 'SHOWED', 'SHOWING', 'SISTER', 'SIT', 'SITTING', 'SLEEP', 'SLEEPING',
    'SLEPT', 'SORRY', 'STAND', 'STANDING', 'START', 'STARTED', 'STARTING', 'STOOD', 'STOP', 'STUDENT',
    'STUDENTS', 'STUDIED', 'STUDY', 'STUDYING', 'TABLE', 'TAKE', 'TAKING', 'TALK', 'TALKED', 'TALKING',
    'TAUGHT', 'TEA', 'TEACHER', 'TEACHERS', 'TEACHING', 'TELL', 'TELLING', 'THANK_YOU', 'THINK', 'THINKING',
    'THOUGHT', 'TIME', 'TIRED', 'TOILET', 'TOLD', 'TOOK', 'TRAIN', 'TRIED', 'TRY', 'TRYING',
    'UNDERSTAND', 'USE', 'USED', 'USING', 'VEGETABLE', 'VILLAGE', 'WAIT', 'WAITING', 'WAIT_MINUTE', 'WALK',
    'WALKED', 'WALKING', 'WANT', 'WANTING', 'WATER', 'WELCOME', 'WHAT', 'WHEN', 'WHERE', 'WHICH',
    'WHO', 'WHY', 'WINDOW', 'WOMAN', 'WORK', 'WORKED', 'WORKING', 'WRITE', 'WRITING', 'WROTE',
    'YES', 'YOU', 'YOUR', 'YOURS'
]
SUPPORTED_SET = set(SUPPORTED_TOKENS)

# Dedicated list of vocabulary items that lack 3D skeletal animations and deliberately rely on A-Z fingerspelling
FINGERSPELL_ONLY_WORDS = [
    "DAY", "NIGHT", "WEATHER", "RAIN", "HOT", "COLD", "SUN", "CLOUD", "WIND", "STORM",
    "TODAY", "TOMORROW", "YESTERDAY", "WEEK", "MONTH", "YEAR", "AFTERNOON", "EVENING",
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST",
    "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
    "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "AMIT", "PRIYA", "RAHUL", "JOHN", "DELHI", "MUMBAI", "INDIA"
]

CONTRACTIONS = {
    "what's": "what is", "whats": "what is",
    "where's": "where is", "wheres": "where is",
    "how's": "how is", "hows": "how is",
    "who's": "who is", "whos": "who is",
    "when's": "when is", "whens": "when is",
    "why's": "why is", "whys": "why is",
    "which's": "which is",
    "it's": "it is", "that's": "that is",
    "there's": "there is", "i'm": "i am", "im": "i am",
    "you're": "you are", "youre": "you are",
    "we're": "we are", "they're": "they are",
    "he's": "he is", "she's": "she is",
    "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
    "i'll": "i will", "you'll": "you will", "we'll": "we will", "they'll": "they will",
    "don't": "do not", "dont": "do not",
    "doesn't": "does not", "doesnt": "does not",
    "didn't": "did not", "didnt": "did not",
    "can't": "cannot", "cant": "cannot",
    "won't": "will not", "wont": "will not",
    "isn't": "is not", "isnt": "is not",
    "aren't": "are not", "arent": "are not",
    "wasn't": "was not", "wasnt": "was not",
    "weren't": "were not", "werent": "were not",
    "haven't": "have not", "havent": "have not",
    "hasn't": "has not", "hasnt": "has not",
    "hadn't": "had not", "hadnt": "had not",
    "wouldn't": "would not", "couldn't": "could not", "shouldn't": "should not",
    "let's": "let us",
}

SYNONYMS = {
    "hi": "hello", "hey": "hello", "greetings": "hello",
    "thanks": "thank you", "thankyou": "thank you", "tysm": "thank you",
    "bye": "good", "goodbye": "good",
    "mom": "mother", "mummy": "mother", "mama": "mother",
    "dad": "father", "papa": "father", "daddy": "father",
    "bro": "brother", "sis": "sister",
    "kid": "child", "kids": "child", "children": "child",
    "pal": "friend", "buddy": "friend", "buddies": "friend",
    "store": "shop", "stores": "shop", "supermarket": "shop",
    "physician": "doctor", "medic": "doctor",
    "clinic": "hospital", "infirmary": "hospital",
    "cab": "car", "taxi": "car", "auto": "car", "vehicle": "car",
    "coach": "bus", "metro": "train", "railway": "train",
    "glad": "happy", "joyful": "happy", "delighted": "happy", "cheerful": "happy",
    "unhappy": "sad", "upset": "sad", "sorrow": "sad",
    "mad": "angry", "furious": "angry", "irritated": "angry",
    "afraid": "scared", "fearful": "scared", "frightened": "scared",
    "exhausted": "tired", "sleepy": "tired", "weary": "tired",
    "meal": "food", "snack": "food", "dish": "food",
    "beverage": "drink", "sip": "drink",
    "aqua": "water", "roti": "bread", "toast": "bread", "supper": "dinner",
    "assist": "help", "assistance": "help", "ache": "pain", "hurt": "pain", "sore": "pain",
    "street": "road", "path": "road", "lane": "road", "highway": "road",
    "cost": "how much", "price": "how much", "rate": "how much",
    "count": "how many", "quantity": "how many",
    "purse": "bag", "backpack": "bag", "sack": "bag",
    "clothing": "clothes", "dress": "clothes", "garments": "clothes",
    "town": "city", "garden": "park", "bazaar": "market",
    "pc": "computer", "laptop": "computer",
    "cellphone": "mobile", "smartphone": "mobile", "telephone": "phone",
    "clock": "time", "hour": "time", "timing": "time",
    "prompt": "early", "ahead": "early", "delayed": "late",
    "urgent": "emergency", "crisis": "emergency", "hazard": "danger", "risky": "danger",
    "secure": "safe", "safety": "safe", "halt": "stop",
    "reside": "live", "recall": "remember", "ponder": "think",
    "trust": "believe", "faith": "believe", "care": "love", "adore": "love",
    "enjoy": "like", "prefer": "like", "prepared": "ready",
}

DIGIT_MAP = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"
}

IRREGULAR_VERBS = {
    "went": "go", "gone": "go", "going": "go", "goes": "go",
    "ate": "eat", "eaten": "eat", "eating": "eat", "eats": "eat",
    "drank": "drink", "drunk": "drink", "drinking": "drink", "drinks": "drink",
    "saw": "see", "seen": "see", "seeing": "see", "sees": "see",
    "came": "come", "coming": "come", "comes": "come",
    "ran": "run", "running": "run", "runs": "run",
    "wrote": "write", "written": "write", "writing": "write", "writes": "write",
    "read": "read", "reading": "read", "reads": "read",
    "bought": "buy", "buying": "buy", "buys": "buy",
    "spoke": "speak", "spoken": "speak", "speaking": "speak", "speaks": "speak",
    "thought": "think", "thinking": "think", "thinks": "think",
    "took": "take", "taken": "take", "taking": "take", "takes": "take",
    "gave": "give", "given": "give", "giving": "give", "gives": "give",
}

PHRASES = {
    "HOW ARE YOU": ["YOU", "HOW"],
    "HOW ARE YOU DOING": ["YOU", "HOW"],
    "WHAT IS YOUR NAME": ["YOUR", "NAME", "WHAT"],
    "WHAT'S YOUR NAME": ["YOUR", "NAME", "WHAT"],
    "MY NAME IS": ["MY", "NAME"],
    "WHERE DO YOU LIVE": ["YOU", "LIVE", "WHERE"],
    "WHERE ARE YOU FROM": ["YOU", "WHERE", "FROM"],
    "WHERE ARE YOU GOING": ["YOU", "GO", "WHERE"],
    "SEE YOU LATER": ["LATER", "YOU", "SEE"],
    "NICE TO MEET YOU": ["YOU", "MEET"],
    "GOOD MORNING": ["GOOD", "MORNING"],
    "THANK YOU": ["THANK_YOU"],
    "THANK YOU VERY MUCH": ["THANK_YOU"],
    "PLEASE HELP ME": ["ME", "HELP", "PLEASE"],
    "HELP ME": ["ME", "HELP"],
    "I LOVE YOU": ["I", "YOU", "LOVE"],
    "I DO NOT KNOW": ["I", "KNOW", "NO"],
    "I DONT KNOW": ["I", "KNOW", "NO"],
    "WHERE IS HOSPITAL": ["HOSPITAL", "WHERE"],
    "WHERE IS THE HOSPITAL": ["HOSPITAL", "WHERE"],
    "WHERE IS TOILET": ["TOILET", "WHERE"],
    "WHERE IS DOCTOR": ["DOCTOR", "WHERE"],
    "I AM IN PAIN": ["I", "PAIN"],
    "NEED HELP": ["NEED_HELP"],
    "WAIT A MINUTE": ["WAIT_MINUTE"],
}

STOPWORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "been",
    "being", "to", "of", "for", "with", "at", "by", "from", "up", "about",
    "into", "over", "after", "do", "does", "did", "will", "would", "shall",
    "should", "can", "could", "may", "might", "must", "have", "has", "had",
}

PRONOUN_MAP = {
    "I": "I", "ME": "I", "MYSELF": "I", "WE": "I", "US": "I",
    "MY": "MY", "MINE": "MY", "OUR": "MY", "OURS": "MY",
    "YOU": "YOU", "YOUR": "YOUR", "YOURS": "YOUR",
    "HE": "PERSON", "HIM": "PERSON", "SHE": "PERSON", "HER": "PERSON",
    "THEY": "PERSON", "THEM": "PERSON",
}

QUESTION_WORDS = {"WHAT", "WHY", "WHEN", "WHERE", "WHO", "HOW", "WHICH", "HOW_MUCH", "HOW_MANY"}
TIME_WORDS = {"TODAY", "TOMORROW", "YESTERDAY", "NOW", "LATER", "MORNING", "NIGHT", "TIME", "EARLY", "LATE"}
NEGATION_WORDS = {"NOT", "NO", "NEVER"}


def validate_sentence(raw_text: Any) -> Tuple[bool, str, Optional[str]]:
    """Validates sentence input."""
    if raw_text is None:
        return False, "", "Please enter a sentence to translate."
    text = str(raw_text).strip()
    if not text:
        return False, "", "Please enter a sentence to translate."
    if len(text) > 250:
        return False, "", f"Sentence is too long ({len(text)} chars). Max length is 250."
    
    # Sanitize emoji / unsupported symbols
    sanitized = re.sub(r'[\U00010000-\U0010ffff]', ' ', text)
    sanitized = re.sub(r'[^\w\s,.?!\'-]', ' ', sanitized)
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    if not sanitized:
        return False, "", "Sentence contains no readable words."
    return True, sanitized, None


def lemmatize(word: str) -> str:
    w = word.lower()
    if w in IRREGULAR_VERBS:
        return IRREGULAR_VERBS[w]
    if w.endswith("ing") and len(w) > 4:
        stem = w[:-3]
        if stem in IRREGULAR_VERBS:
            return IRREGULAR_VERBS[stem]
        return stem
    if w.endswith("ed") and len(w) > 3:
        return w[:-2]
    if w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        return w[:-1]
    return w


def text_to_isl_tokens(sentence: str) -> List[str]:
    """Deterministic rule-based converter to ISL gloss tokens."""
    expanded = sentence.lower()

    # 1. Expand contractions
    for contr, repl in CONTRACTIONS.items():
        expanded = re.sub(r'\b' + re.escape(contr) + r'\b', repl, expanded)

    # 2. Map digit numbers (e.g. 1 -> one, 5 -> five)
    for digit, word in DIGIT_MAP.items():
        expanded = re.sub(r'\b' + re.escape(digit) + r'\b', word, expanded)

    # 3. Apply synonyms
    for syn, target in sorted(SYNONYMS.items(), key=lambda x: -len(x[0])):
        expanded = re.sub(r'\b' + re.escape(syn) + r'\b', target, expanded)

    cleaned_upper = re.sub(r'[^\w\s]', ' ', expanded).upper()
    cleaned_str = re.sub(r'\s+', ' ', cleaned_upper).strip()

    # 4. Check whole-phrase match
    for phrase, p_tokens in sorted(PHRASES.items(), key=lambda x: -len(x[0])):
        if phrase in cleaned_str:
            cleaned_str = cleaned_str.replace(phrase, " ".join(p_tokens))

    words = [w for w in cleaned_str.split() if w]
    time_tokens = []
    subject_tokens = []
    object_tokens = []
    verb_tokens = []
    negation_tokens = []
    question_tokens = []

    for raw_w in words:
        low = raw_w.lower()
        if low in STOPWORDS and raw_w not in SUPPORTED_SET:
            continue

        # If already supported directly (e.g. BOOKS, COMING, EATING), keep it!
        if raw_w in SUPPORTED_SET:
            token = raw_w
        else:
            lemma = lemmatize(low).upper()
            token = PRONOUN_MAP.get(lemma, lemma)

        # Categorize for ISL SOV syntax
        if token in QUESTION_WORDS:
            question_tokens.append(token)
        elif token in TIME_WORDS:
            time_tokens.append(token)
        elif token in NEGATION_WORDS:
            negation_tokens.append(token)
        elif token in {"I", "MY", "YOUR", "YOU", "PERSON"}:
            subject_tokens.append(token)
        elif token in SUPPORTED_SET:
            # Check common verbs vs objects
            if token in {"GO", "COME", "EAT", "DRINK", "GIVE", "TAKE", "SEE", "LOOK", "WANT", "NEED", "LIKE", "KNOW", "UNDERSTAND", "READ", "WRITE", "STUDY", "HELP"}:
                verb_tokens.append(token)
            else:
                object_tokens.append(token)
        else:
            object_tokens.append(token)

    # Order: TIME -> SUBJECT -> OBJECT -> VERB -> NEGATION -> QUESTION
    ordered = time_tokens + subject_tokens + object_tokens + verb_tokens + negation_tokens + question_tokens
    if not ordered:
        ordered = [lemmatize(w.lower()).upper() for w in words]

    # Deduplicate consecutive identical tokens
    final_tokens = []
    for t in ordered:
        if not final_tokens or final_tokens[-1] != t:
            final_tokens.append(t)
    return final_tokens


def build_structured_tokens(tokens: List[str]) -> List[Dict[str, Any]]:
    """Converts token list to structured schema, expanding unsupported words into fingerspelling."""
    structured = []
    for token in tokens:
        normalized = re.sub(r'[^A-Z_]', '', token.strip().upper())
        if not normalized:
            continue

        if normalized in SUPPORTED_SET:
            action_id = f"clip_{normalized.lower()}"
            structured.append({
                "word": normalized,
                "sign_id": action_id,
                "type": "sign",
                "duration": 850,
            })
        else:
            # Fall back to letter-by-letter fingerspelling
            for letter in normalized.replace("_", ""):
                if re.match(r'^[A-Z]$', letter):
                    structured.append({
                        "word": letter,
                        "sign_id": letter,
                        "type": "fingerspell",
                        "duration": 380,
                        "sourceWord": normalized,
                    })
    return structured


def call_gemini_api(text: str, api_key: str) -> Optional[List[str]]:
    """Optional online translation using Google Gemini Flash REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    system_instruction = (
        "You are an ISL interpreter. Convert the English sentence into an array of canonical ISL gloss tokens in SOV order. "
        f"Only use these supported tokens where possible: {json.dumps(SUPPORTED_TOKENS)}. "
        "For unknown words or names, output individual uppercase letters for fingerspelling. Output ONLY a JSON array of strings."
    )
    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json"
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)
            if isinstance(parsed, list):
                return [str(item).strip().upper() for item in parsed if item]
    except Exception as e:
        print(f"[-] Gemini API failed, falling back to offline engine: {e}")
    return None


def translate_to_sign(raw_text: Any) -> Dict[str, Any]:
    """Main service entry point with LRU caching."""
    valid, sanitized, err_msg = validate_sentence(raw_text)
    if not valid:
        return {"error": err_msg, "tokens": [], "sentence": str(raw_text or "")}

    cache_key = sanitized.lower()
    if cache_key in _cache:
        cached = _cache[cache_key]
        _cache.move_to_end(cache_key)
        return {**cached, "cached": True}

    mode = "offline"
    tokens_raw = None

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        tokens_raw = call_gemini_api(sanitized, gemini_key)
        if tokens_raw:
            mode = "online"

    if not tokens_raw:
        tokens_raw = text_to_isl_tokens(sanitized)

    structured_tokens = build_structured_tokens(tokens_raw)
    gloss_text = " ".join(t["word"] for t in structured_tokens)

    result = {
        "sentence": sanitized,
        "rawText": sanitized,
        "glossText": gloss_text,
        "tokens": structured_tokens,
        "mode": mode,
        "cached": False,
    }

    if len(_cache) >= MAX_CACHE_SIZE:
        _cache.popitem(last=False)
    _cache[cache_key] = result

    return result
