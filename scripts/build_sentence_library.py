"""
Build & Validate Practice Sentences Library
===========================================
Generates data/sentences.json conforming to all prompt specifications:
- At least 10 sentences per category (11 categories = 110+ sentences)
- Beginner (2-4 words), Intermediate (5-8 words), Advanced (9-15 words)
- Categories:
  1. Greetings and introductions
  2. Daily routine
  3. Family and friends
  4. School and college
  5. Food and drinks
  6. Health and emergencies
  7. Travel and directions
  8. Shopping and money
  9. Feelings and emotions
  10. Questions (who, what, where, when, why, how)
  11. Time, days, weather
"""

import json
import os

SENTENCES = [
    # -------------------------------------------------------------------------
    # 1. Greetings and introductions (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "greet_01",
        "text": "Hello, how are you?",
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "signs": ["hello", "how", "you"]
    },
    {
        "id": "greet_02",
        "text": "Good morning my friend.",
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "signs": ["good_morning", "my", "friend"]
    },
    {
        "id": "greet_03",
        "text": "Nice to meet you.",
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "signs": ["nice_to_meet_you"]
    },
    {
        "id": "greet_04",
        "text": "Good night, sleep well.",
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "signs": ["good_night", "sleep", "good"]
    },
    {
        "id": "greet_05",
        "text": "What is your name please?",
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "signs": ["what", "your", "name", "please"]
    },
    {
        "id": "greet_06",
        "text": "My name is John, hello.",
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "signs": ["my", "name", "hello"]
    },
    {
        "id": "greet_07",
        "text": "Welcome to my home today.",
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "signs": ["welcome", "my", "home", "today"]
    },
    {
        "id": "greet_08",
        "text": "Thank you very much my friend.",
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "signs": ["thank_you", "more", "my", "friend"]
    },
    {
        "id": "greet_09",
        "text": "Hello, it is nice to meet your family today.",
        "category": "Greetings and introductions",
        "difficulty": "advanced",
        "signs": ["hello", "nice_to_meet_you", "your", "family", "today"]
    },
    {
        "id": "greet_10",
        "text": "Good morning teacher, thank you for helping me learn sign language.",
        "category": "Greetings and introductions",
        "difficulty": "advanced",
        "signs": ["good_morning", "teacher", "thank_you", "help", "me", "learn"]
    },

    # -------------------------------------------------------------------------
    # 2. Daily routine (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "daily_01",
        "text": "I wake up now.",
        "category": "Daily routine",
        "difficulty": "beginner",
        "signs": ["i", "wake", "now"]
    },
    {
        "id": "daily_02",
        "text": "Time to eat breakfast.",
        "category": "Daily routine",
        "difficulty": "beginner",
        "signs": ["time", "eat", "breakfast"]
    },
    {
        "id": "daily_03",
        "text": "I go to work.",
        "category": "Daily routine",
        "difficulty": "beginner",
        "signs": ["i", "go", "work"]
    },
    {
        "id": "daily_04",
        "text": "Time to sleep now.",
        "category": "Daily routine",
        "difficulty": "beginner",
        "signs": ["time", "sleep", "now"]
    },
    {
        "id": "daily_05",
        "text": "I finish my work today.",
        "category": "Daily routine",
        "difficulty": "intermediate",
        "signs": ["i", "finish", "my", "work", "today"]
    },
    {
        "id": "daily_06",
        "text": "Every morning I drink hot coffee.",
        "category": "Daily routine",
        "difficulty": "intermediate",
        "signs": ["morning", "i", "drink", "hot", "coffee"]
    },
    {
        "id": "daily_07",
        "text": "We walk to school every day.",
        "category": "Daily routine",
        "difficulty": "intermediate",
        "signs": ["we", "walk", "school", "day"]
    },
    {
        "id": "daily_08",
        "text": "I eat dinner with my family.",
        "category": "Daily routine",
        "difficulty": "intermediate",
        "signs": ["i", "eat", "dinner", "my", "family"]
    },
    {
        "id": "daily_09",
        "text": "Every day I wake up early, drink water, and walk.",
        "category": "Daily routine",
        "difficulty": "advanced",
        "signs": ["day", "i", "wake", "drink", "water", "walk"]
    },
    {
        "id": "daily_10",
        "text": "I finish work at five, then go home and eat dinner.",
        "category": "Daily routine",
        "difficulty": "advanced",
        "signs": ["i", "finish", "work", "five", "go", "home", "eat", "dinner"]
    },

    # -------------------------------------------------------------------------
    # 3. Family and friends (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "fam_01",
        "text": "I love my mother.",
        "category": "Family and friends",
        "difficulty": "beginner",
        "signs": ["i", "love", "my", "mother"]
    },
    {
        "id": "fam_02",
        "text": "My father is home.",
        "category": "Family and friends",
        "difficulty": "beginner",
        "signs": ["my", "father", "home"]
    },
    {
        "id": "fam_03",
        "text": "You are my friend.",
        "category": "Family and friends",
        "difficulty": "beginner",
        "signs": ["you", "my", "friend"]
    },
    {
        "id": "fam_04",
        "text": "Meet my brother today.",
        "category": "Family and friends",
        "difficulty": "beginner",
        "signs": ["meet", "my", "brother", "today"]
    },
    {
        "id": "fam_05",
        "text": "My sister likes to read books.",
        "category": "Family and friends",
        "difficulty": "intermediate",
        "signs": ["my", "sister", "like", "read", "book"]
    },
    {
        "id": "fam_06",
        "text": "I love my whole family.",
        "category": "Family and friends",
        "difficulty": "intermediate",
        "signs": ["i", "love", "my", "family"]
    },
    {
        "id": "fam_07",
        "text": "That man is my good friend.",
        "category": "Family and friends",
        "difficulty": "intermediate",
        "signs": ["man", "my", "good", "friend"]
    },
    {
        "id": "fam_08",
        "text": "The baby is sleeping now.",
        "category": "Family and friends",
        "difficulty": "intermediate",
        "signs": ["baby", "sleep", "now"]
    },
    {
        "id": "fam_09",
        "text": "My mother and father teach my brother and sister at home.",
        "category": "Family and friends",
        "difficulty": "advanced",
        "signs": ["my", "mother", "father", "teach", "brother", "sister", "home"]
    },
    {
        "id": "fam_10",
        "text": "I want to meet your family and play with your children.",
        "category": "Family and friends",
        "difficulty": "advanced",
        "signs": ["i", "want", "meet", "your", "family", "play", "child"]
    },

    # -------------------------------------------------------------------------
    # 4. School and college (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "school_01",
        "text": "I like school.",
        "category": "School and college",
        "difficulty": "beginner",
        "signs": ["i", "like", "school"]
    },
    {
        "id": "school_02",
        "text": "Read this good book.",
        "category": "School and college",
        "difficulty": "beginner",
        "signs": ["read", "good", "book"]
    },
    {
        "id": "school_03",
        "text": "Write your name here.",
        "category": "School and college",
        "difficulty": "beginner",
        "signs": ["write", "your", "name", "here"]
    },
    {
        "id": "school_04",
        "text": "We learn sign language.",
        "category": "School and college",
        "difficulty": "beginner",
        "signs": ["we", "learn", "sign"]
    },
    {
        "id": "school_05",
        "text": "The teacher has a question.",
        "category": "School and college",
        "difficulty": "intermediate",
        "signs": ["teacher", "have", "question"]
    },
    {
        "id": "school_06",
        "text": "Students study in the library.",
        "category": "School and college",
        "difficulty": "intermediate",
        "signs": ["student", "study", "book"]
    },
    {
        "id": "school_07",
        "text": "I understand your answer teacher.",
        "category": "School and college",
        "difficulty": "intermediate",
        "signs": ["i", "understand", "your", "answer", "teacher"]
    },
    {
        "id": "school_08",
        "text": "College class starts tomorrow morning.",
        "category": "School and college",
        "difficulty": "intermediate",
        "signs": ["college", "class", "start", "tomorrow", "morning"]
    },
    {
        "id": "school_09",
        "text": "Please write the question in your book so we can learn.",
        "category": "School and college",
        "difficulty": "advanced",
        "signs": ["please", "write", "question", "your", "book", "we", "can", "learn"]
    },
    {
        "id": "school_10",
        "text": "The students in college study every day and ask many questions.",
        "category": "School and college",
        "difficulty": "advanced",
        "signs": ["student", "college", "study", "day", "ask", "question"]
    },

    # -------------------------------------------------------------------------
    # 5. Food and drinks (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "food_01",
        "text": "I drink cold water.",
        "category": "Food and drinks",
        "difficulty": "beginner",
        "signs": ["i", "drink", "cold", "water"]
    },
    {
        "id": "food_02",
        "text": "I eat good food.",
        "category": "Food and drinks",
        "difficulty": "beginner",
        "signs": ["i", "eat", "good", "food"]
    },
    {
        "id": "food_03",
        "text": "I want hot tea.",
        "category": "Food and drinks",
        "difficulty": "beginner",
        "signs": ["i", "want", "hot", "tea"]
    },
    {
        "id": "food_04",
        "text": "Please give me milk.",
        "category": "Food and drinks",
        "difficulty": "beginner",
        "signs": ["please", "give", "me", "milk"]
    },
    {
        "id": "food_05",
        "text": "The apple is sweet and good.",
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "signs": ["apple", "good"]
    },
    {
        "id": "food_06",
        "text": "I am hungry, I want bread.",
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "signs": ["i", "hungry", "i", "want", "bread"]
    },
    {
        "id": "food_07",
        "text": "I am thirsty, please give water.",
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "signs": ["i", "thirsty", "please", "water"]
    },
    {
        "id": "food_08",
        "text": "We eat dinner at home tonight.",
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "signs": ["we", "eat", "dinner", "home", "night"]
    },
    {
        "id": "food_09",
        "text": "I want to eat bread and drink hot coffee for breakfast.",
        "category": "Food and drinks",
        "difficulty": "advanced",
        "signs": ["i", "want", "eat", "bread", "drink", "hot", "coffee", "breakfast"]
    },
    {
        "id": "food_10",
        "text": "If you are hungry, we have fresh apples, bread, and milk.",
        "category": "Food and drinks",
        "difficulty": "advanced",
        "signs": ["you", "hungry", "we", "have", "apple", "bread", "milk"]
    },

    # -------------------------------------------------------------------------
    # 6. Health and emergencies (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "health_01",
        "text": "I need help please.",
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "signs": ["i", "need", "help", "please"]
    },
    {
        "id": "health_02",
        "text": "Stop, this is emergency.",
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "signs": ["stop", "emergency"]
    },
    {
        "id": "health_03",
        "text": "I am sick today.",
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "signs": ["i", "sick", "today"]
    },
    {
        "id": "health_04",
        "text": "Where is the doctor?",
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "signs": ["where", "doctor"]
    },
    {
        "id": "health_05",
        "text": "Please take me to hospital.",
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "signs": ["please", "take", "me", "hospital"]
    },
    {
        "id": "health_06",
        "text": "My head hurts very bad.",
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "signs": ["my", "head", "hurt", "bad"]
    },
    {
        "id": "health_07",
        "text": "I need to take medicine.",
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "signs": ["i", "need", "medicine"]
    },
    {
        "id": "health_08",
        "text": "Do not worry, you are safe.",
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "signs": ["no", "you", "safe"]
    },
    {
        "id": "health_09",
        "text": "Please call a doctor because my brother is very sick.",
        "category": "Health and emergencies",
        "difficulty": "advanced",
        "signs": ["please", "call", "doctor", "my", "brother", "sick"]
    },
    {
        "id": "health_10",
        "text": "In an emergency, stay safe and go to the hospital quickly.",
        "category": "Health and emergencies",
        "difficulty": "advanced",
        "signs": ["emergency", "stay", "safe", "go", "hospital"]
    },

    # -------------------------------------------------------------------------
    # 7. Travel and directions (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "travel_01",
        "text": "Where is the car?",
        "category": "Travel and directions",
        "difficulty": "beginner",
        "signs": ["where", "car"]
    },
    {
        "id": "travel_02",
        "text": "We go by bus.",
        "category": "Travel and directions",
        "difficulty": "beginner",
        "signs": ["we", "go", "bus"]
    },
    {
        "id": "travel_03",
        "text": "Turn right and stop.",
        "category": "Travel and directions",
        "difficulty": "beginner",
        "signs": ["turn", "right", "stop"]
    },
    {
        "id": "travel_04",
        "text": "Turn left at corner.",
        "category": "Travel and directions",
        "difficulty": "beginner",
        "signs": ["turn", "left"]
    },
    {
        "id": "travel_05",
        "text": "The airplane is very fast.",
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "signs": ["airplane", "fast"]
    },
    {
        "id": "travel_06",
        "text": "We travel by train today.",
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "signs": ["we", "travel", "train", "today"]
    },
    {
        "id": "travel_07",
        "text": "Go straight then turn right.",
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "signs": ["go", "straight", "turn", "right"]
    },
    {
        "id": "travel_08",
        "text": "Where is the bus station?",
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "signs": ["where", "bus", "station"]
    },
    {
        "id": "travel_09",
        "text": "We want to travel by airplane to visit our family.",
        "category": "Travel and directions",
        "difficulty": "advanced",
        "signs": ["we", "want", "travel", "airplane", "visit", "family"]
    },
    {
        "id": "travel_10",
        "text": "Drive the car straight ahead, then turn left at the hospital.",
        "category": "Travel and directions",
        "difficulty": "advanced",
        "signs": ["car", "straight", "turn", "left", "hospital"]
    },

    # -------------------------------------------------------------------------
    # 8. Shopping and money (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "shop_01",
        "text": "How much cost?",
        "category": "Shopping and money",
        "difficulty": "beginner",
        "signs": ["how", "cost"]
    },
    {
        "id": "shop_02",
        "text": "I want to buy.",
        "category": "Shopping and money",
        "difficulty": "beginner",
        "signs": ["i", "want", "buy"]
    },
    {
        "id": "shop_03",
        "text": "I pay money now.",
        "category": "Shopping and money",
        "difficulty": "beginner",
        "signs": ["i", "pay", "money", "now"]
    },
    {
        "id": "shop_04",
        "text": "This is cheap today.",
        "category": "Shopping and money",
        "difficulty": "beginner",
        "signs": ["cheap", "today"]
    },
    {
        "id": "shop_05",
        "text": "That car is too expensive.",
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "signs": ["car", "expensive"]
    },
    {
        "id": "shop_06",
        "text": "We go to store together.",
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "signs": ["we", "go", "store"]
    },
    {
        "id": "shop_07",
        "text": "I have five dollars here.",
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "signs": ["i", "have", "five", "money", "here"]
    },
    {
        "id": "shop_08",
        "text": "Do you accept card payment?",
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "signs": ["you", "pay"]
    },
    {
        "id": "shop_09",
        "text": "I need to go to the store to buy food.",
        "category": "Shopping and money",
        "difficulty": "advanced",
        "signs": ["i", "need", "go", "store", "buy", "food"]
    },
    {
        "id": "shop_10",
        "text": "How much money does this book cost to buy today?",
        "category": "Shopping and money",
        "difficulty": "advanced",
        "signs": ["how", "money", "book", "cost", "buy", "today"]
    },

    # -------------------------------------------------------------------------
    # 9. Feelings and emotions (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "feel_01",
        "text": "I feel very happy.",
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "signs": ["i", "feel", "happy"]
    },
    {
        "id": "feel_02",
        "text": "Why are you sad?",
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "signs": ["why", "you", "sad"]
    },
    {
        "id": "feel_03",
        "text": "I feel tired now.",
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "signs": ["i", "feel", "tired", "now"]
    },
    {
        "id": "feel_04",
        "text": "Peace and love always.",
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "signs": ["peace", "love"]
    },
    {
        "id": "feel_05",
        "text": "My friend is very angry.",
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "signs": ["my", "friend", "angry"]
    },
    {
        "id": "feel_06",
        "text": "We are excited to learn.",
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "signs": ["we", "excited", "learn"]
    },
    {
        "id": "feel_07",
        "text": "Do not be afraid now.",
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "signs": ["no", "afraid", "now"]
    },
    {
        "id": "feel_08",
        "text": "I feel fine and good.",
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "signs": ["i", "feel", "fine", "good"]
    },
    {
        "id": "feel_09",
        "text": "I am so happy because my family is with me.",
        "category": "Feelings and emotions",
        "difficulty": "advanced",
        "signs": ["i", "happy", "my", "family", "with", "me"]
    },
    {
        "id": "feel_10",
        "text": "When you are tired, rest at home and feel peaceful.",
        "category": "Feelings and emotions",
        "difficulty": "advanced",
        "signs": ["when", "you", "tired", "rest", "home", "peace"]
    },

    # -------------------------------------------------------------------------
    # 10. Questions (who, what, where, when, why, how) (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "quest_01",
        "text": "Who is that person?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "signs": ["who", "person"]
    },
    {
        "id": "quest_02",
        "text": "What do you want?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "signs": ["what", "you", "want"]
    },
    {
        "id": "quest_03",
        "text": "Where is my book?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "signs": ["where", "my", "book"]
    },
    {
        "id": "quest_04",
        "text": "When do we start?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "signs": ["when", "we", "start"]
    },
    {
        "id": "quest_05",
        "text": "Why are you here today?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "signs": ["why", "you", "here", "today"]
    },
    {
        "id": "quest_06",
        "text": "How do you sign that?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "signs": ["how", "you", "sign"]
    },
    {
        "id": "quest_07",
        "text": "Which book do you like?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "signs": ["which", "book", "you", "like"]
    },
    {
        "id": "quest_08",
        "text": "Who can teach me today?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "signs": ["who", "can", "teach", "me", "today"]
    },
    {
        "id": "quest_09",
        "text": "Where is the school, and when does our class start?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "advanced",
        "signs": ["where", "school", "when", "our", "class", "start"]
    },
    {
        "id": "quest_10",
        "text": "Why do you want to learn sign language with us today?",
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "advanced",
        "signs": ["why", "you", "want", "learn", "sign", "with", "us", "today"]
    },

    # -------------------------------------------------------------------------
    # 11. Time, days, weather (10 sentences)
    # -------------------------------------------------------------------------
    {
        "id": "time_01",
        "text": "What time is it?",
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "signs": ["what", "time"]
    },
    {
        "id": "time_02",
        "text": "It is hot today.",
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "signs": ["hot", "today"]
    },
    {
        "id": "time_03",
        "text": "Cold rain falls down.",
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "signs": ["cold", "rain"]
    },
    {
        "id": "time_04",
        "text": "Tomorrow new day.",
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "signs": ["tomorrow", "day"]
    },
    {
        "id": "time_05",
        "text": "The sun is shining bright.",
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "signs": ["sun", "bright"]
    },
    {
        "id": "time_06",
        "text": "Yesterday night it was cold.",
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "signs": ["yesterday", "night", "cold"]
    },
    {
        "id": "time_07",
        "text": "White snow falls this winter.",
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "signs": ["snow", "winter"]
    },
    {
        "id": "time_08",
        "text": "We wait for good weather.",
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "signs": ["we", "wait", "good", "weather"]
    },
    {
        "id": "time_09",
        "text": "Today the weather is hot, but tomorrow it will rain.",
        "category": "Time, days, weather",
        "difficulty": "advanced",
        "signs": ["today", "weather", "hot", "tomorrow", "rain"]
    },
    {
        "id": "time_10",
        "text": "What is the time now, and when will the rain stop?",
        "category": "Time, days, weather",
        "difficulty": "advanced",
        "signs": ["what", "time", "now", "when", "rain", "stop"]
    }
]

def build_sentences():
    target_path = os.path.join("data", "sentences.json")
    os.makedirs("data", exist_ok=True)

    # Validate categories
    cats = {}
    for s in SENTENCES:
        cats[s["category"]] = cats.get(s["category"], 0) + 1

    print(f"Total sentences: {len(SENTENCES)}")
    for cat, count in cats.items():
        print(f"  - {cat}: {count} sentences")

    # Validate word lengths per difficulty
    for s in SENTENCES:
        word_count = len(s["text"].split())
        diff = s["difficulty"]
        if diff == "beginner" and not (2 <= word_count <= 4):
            print(f"  [Notice] Beginner sentence '{s['text']}' has {word_count} words")
        elif diff == "intermediate" and not (5 <= word_count <= 8):
            print(f"  [Notice] Intermediate sentence '{s['text']}' has {word_count} words")
        elif diff == "advanced" and not (9 <= word_count <= 15):
            print(f"  [Notice] Advanced sentence '{s['text']}' has {word_count} words")

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(SENTENCES, f, indent=2, ensure_ascii=False)

    print(f"\n[+] Wrote {len(SENTENCES)} validated practice sentences to {target_path}")

if __name__ == "__main__":
    build_sentences()
