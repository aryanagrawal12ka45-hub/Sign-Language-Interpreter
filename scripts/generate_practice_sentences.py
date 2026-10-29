#!/usr/bin/env python3
"""
Generate and validate the comprehensive Practice Sentences library.
Ensures at least 10 sentences per category (11 categories = 110+ sentences),
categorized with beginner, intermediate, and advanced difficulties.
"""

import json
import os
import re

CATEGORIES = [
    "Greetings and introductions",
    "Daily routine",
    "Family and friends",
    "School and college",
    "Food and drinks",
    "Health and emergencies",
    "Travel and directions",
    "Shopping and money",
    "Feelings and emotions",
    "Questions (who, what, where, when, why, how)",
    "Time, days, weather"
]

SENTENCES_DATA = [
    # 1. Greetings and introductions
    {
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "text": "Hello friend"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "text": "Nice to meet you"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "text": "Good morning teacher"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "beginner",
        "text": "Welcome home"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "text": "Hello my name is Rahul"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "text": "I am happy to meet you"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "text": "What is your good name"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "intermediate",
        "text": "Welcome to my home friend"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "advanced",
        "text": "Hello good morning teacher I am ready to learn sign language"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "advanced",
        "text": "Hello my friend it is nice to see you again today"
    },
    {
        "category": "Greetings and introductions",
        "difficulty": "advanced",
        "text": "Please welcome our new student to the class this morning"
    },

    # 2. Daily routine
    {
        "category": "Daily routine",
        "difficulty": "beginner",
        "text": "Wake up early"
    },
    {
        "category": "Daily routine",
        "difficulty": "beginner",
        "text": "Time to sleep"
    },
    {
        "category": "Daily routine",
        "difficulty": "beginner",
        "text": "Start morning walk"
    },
    {
        "category": "Daily routine",
        "difficulty": "beginner",
        "text": "Eat breakfast now"
    },
    {
        "category": "Daily routine",
        "difficulty": "intermediate",
        "text": "I wake up early every morning"
    },
    {
        "category": "Daily routine",
        "difficulty": "intermediate",
        "text": "Finish your work and go home"
    },
    {
        "category": "Daily routine",
        "difficulty": "intermediate",
        "text": "I drink milk before I sleep"
    },
    {
        "category": "Daily routine",
        "difficulty": "intermediate",
        "text": "Please open the room window now"
    },
    {
        "category": "Daily routine",
        "difficulty": "advanced",
        "text": "Every morning I wake up early and go for a long walk"
    },
    {
        "category": "Daily routine",
        "difficulty": "advanced",
        "text": "Please finish your study work before you go out to play"
    },
    {
        "category": "Daily routine",
        "difficulty": "advanced",
        "text": "I eat dinner with my family and then read my book"
    },

    # 3. Family and friends
    {
        "category": "Family and friends",
        "difficulty": "beginner",
        "text": "I love my mother"
    },
    {
        "category": "Family and friends",
        "difficulty": "beginner",
        "text": "My father is good"
    },
    {
        "category": "Family and friends",
        "difficulty": "beginner",
        "text": "Meet my brother"
    },
    {
        "category": "Family and friends",
        "difficulty": "beginner",
        "text": "Help your sister"
    },
    {
        "category": "Family and friends",
        "difficulty": "intermediate",
        "text": "My family lives in a city"
    },
    {
        "category": "Family and friends",
        "difficulty": "intermediate",
        "text": "My friend helps me with study"
    },
    {
        "category": "Family and friends",
        "difficulty": "intermediate",
        "text": "I love my parents very much"
    },
    {
        "category": "Family and friends",
        "difficulty": "intermediate",
        "text": "Her brother is a good boy"
    },
    {
        "category": "Family and friends",
        "difficulty": "advanced",
        "text": "My mother and father live with my sister in our village home"
    },
    {
        "category": "Family and friends",
        "difficulty": "advanced",
        "text": "I want to introduce my best friend to my entire family today"
    },
    {
        "category": "Family and friends",
        "difficulty": "advanced",
        "text": "My brother and sister study hard in college every single day"
    },

    # 4. School and college
    {
        "category": "School and college",
        "difficulty": "beginner",
        "text": "Read this book"
    },
    {
        "category": "School and college",
        "difficulty": "beginner",
        "text": "Study for exam"
    },
    {
        "category": "School and college",
        "difficulty": "beginner",
        "text": "Listen to teacher"
    },
    {
        "category": "School and college",
        "difficulty": "beginner",
        "text": "Write your question"
    },
    {
        "category": "School and college",
        "difficulty": "intermediate",
        "text": "The teacher is in the classroom"
    },
    {
        "category": "School and college",
        "difficulty": "intermediate",
        "text": "Students are reading books in class"
    },
    {
        "category": "School and college",
        "difficulty": "intermediate",
        "text": "I study computer science in college"
    },
    {
        "category": "School and college",
        "difficulty": "intermediate",
        "text": "Please answer my question teacher"
    },
    {
        "category": "School and college",
        "difficulty": "advanced",
        "text": "All college students must finish their computer project before the final exam"
    },
    {
        "category": "School and college",
        "difficulty": "advanced",
        "text": "The teacher asked the class to open books and read carefully"
    },
    {
        "category": "School and college",
        "difficulty": "advanced",
        "text": "I will study hard in school to pass my important exam"
    },

    # 5. Food and drinks
    {
        "category": "Food and drinks",
        "difficulty": "beginner",
        "text": "Drink more water"
    },
    {
        "category": "Food and drinks",
        "difficulty": "beginner",
        "text": "Eat fresh fruit"
    },
    {
        "category": "Food and drinks",
        "difficulty": "beginner",
        "text": "I want tea"
    },
    {
        "category": "Food and drinks",
        "difficulty": "beginner",
        "text": "Rice and bread"
    },
    {
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "text": "Please give me cold drinking water"
    },
    {
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "text": "I like to eat fresh vegetables"
    },
    {
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "text": "Drink hot coffee in the morning"
    },
    {
        "category": "Food and drinks",
        "difficulty": "intermediate",
        "text": "We eat dinner at home together"
    },
    {
        "category": "Food and drinks",
        "difficulty": "advanced",
        "text": "Mother cooked delicious rice and vegetables for our family lunch today"
    },
    {
        "category": "Food and drinks",
        "difficulty": "advanced",
        "text": "Please bring some fresh fruit and hot tea for our guests"
    },
    {
        "category": "Food and drinks",
        "difficulty": "advanced",
        "text": "I want to drink cold milk and eat bread before school"
    },

    # 6. Health and emergencies
    {
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "text": "Please call police"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "text": "I feel pain"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "text": "Where is doctor"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "beginner",
        "text": "Need urgent help"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "text": "Please take me to the hospital"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "text": "The doctor is inside the clinic"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "text": "Stay safe and wait for police"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "intermediate",
        "text": "I have severe pain in body"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "advanced",
        "text": "In case of emergency please call the doctor and police immediately"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "advanced",
        "text": "He is injured and needs help to reach the nearest hospital"
    },
    {
        "category": "Health and emergencies",
        "difficulty": "advanced",
        "text": "Please stop the car and help this person who has pain"
    },

    # 7. Travel and directions
    {
        "category": "Travel and directions",
        "difficulty": "beginner",
        "text": "Where is bus"
    },
    {
        "category": "Travel and directions",
        "difficulty": "beginner",
        "text": "Go to train"
    },
    {
        "category": "Travel and directions",
        "difficulty": "beginner",
        "text": "Follow this road"
    },
    {
        "category": "Travel and directions",
        "difficulty": "beginner",
        "text": "Visit the city"
    },
    {
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "text": "The bus is coming to stop"
    },
    {
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "text": "Where does this road go to"
    },
    {
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "text": "I take train to my village"
    },
    {
        "category": "Travel and directions",
        "difficulty": "intermediate",
        "text": "Walk to the city park now"
    },
    {
        "category": "Travel and directions",
        "difficulty": "advanced",
        "text": "We are traveling by train to visit our grandparents in the village"
    },
    {
        "category": "Travel and directions",
        "difficulty": "advanced",
        "text": "Can you tell me how to reach the railway station from here"
    },
    {
        "category": "Travel and directions",
        "difficulty": "advanced",
        "text": "The car stopped on the road because of heavy traffic today"
    },

    # 8. Shopping and money
    {
        "category": "Shopping and money",
        "difficulty": "beginner",
        "text": "How much money"
    },
    {
        "category": "Shopping and money",
        "difficulty": "beginner",
        "text": "Go to market"
    },
    {
        "category": "Shopping and money",
        "difficulty": "beginner",
        "text": "Buy this bag"
    },
    {
        "category": "Shopping and money",
        "difficulty": "beginner",
        "text": "Pay the shop"
    },
    {
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "text": "How much does this book cost"
    },
    {
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "text": "I want to buy new clothes"
    },
    {
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "text": "Keep your money in the bag"
    },
    {
        "category": "Shopping and money",
        "difficulty": "intermediate",
        "text": "Please give me change for money"
    },
    {
        "category": "Shopping and money",
        "difficulty": "advanced",
        "text": "I went to the market to buy fruits vegetables and clothes"
    },
    {
        "category": "Shopping and money",
        "difficulty": "advanced",
        "text": "How many bags of rice do you want from this shop"
    },
    {
        "category": "Shopping and money",
        "difficulty": "advanced",
        "text": "Please keep your money safe while shopping in the crowded market"
    },

    # 9. Feelings and emotions
    {
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "text": "I am happy"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "text": "Do not be sad"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "text": "Why so angry"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "beginner",
        "text": "I feel tired"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "text": "I am feeling scared of dark"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "text": "Why are you confused about this"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "text": "I believe in you my friend"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "intermediate",
        "text": "She was happy to see family"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "advanced",
        "text": "I was very tired after work but happy to be back home"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "advanced",
        "text": "Do not be scared or angry because we are here to help"
    },
    {
        "category": "Feelings and emotions",
        "difficulty": "advanced",
        "text": "I feel confused because I cannot remember what the teacher taught"
    },

    # 10. Questions (who, what, where, when, why, how)
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "text": "What is this"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "text": "Who are you"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "text": "Where to go"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "beginner",
        "text": "Why are you late"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "text": "When will the train arrive here"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "text": "How many books do you have"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "text": "Where do you want to live"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "intermediate",
        "text": "Why did you not come yesterday"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "advanced",
        "text": "Who can help me understand this difficult question in my school book"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "advanced",
        "text": "When will you finish your college project and go back home"
    },
    {
        "category": "Questions (who, what, where, when, why, how)",
        "difficulty": "advanced",
        "text": "Why are you standing outside when you can come in and sit"
    },

    # 11. Time, days, weather
    {
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "text": "What is time"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "text": "Wait one minute"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "text": "Cold rainy day"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "beginner",
        "text": "Start again now"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "text": "It is time for morning breakfast"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "text": "We are ready to begin now"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "text": "The train is late today morning"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "intermediate",
        "text": "Please wait five minutes for me"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "advanced",
        "text": "What time will the morning class begin and finish on Monday"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "advanced",
        "text": "It is very cold outside today so please wear warm clothes"
    },
    {
        "category": "Time, days, weather",
        "difficulty": "advanced",
        "text": "We must start early in the morning before it gets too hot"
    }
]

def generate():
    # Import text translation logic from backend
    from text_to_sign_backend import translate_to_sign

    formatted = []
    category_counts = {}
    difficulty_counts = {"beginner": 0, "intermediate": 0, "advanced": 0}

    for idx, item in enumerate(SENTENCES_DATA, start=1):
        cat = item["category"]
        diff = item["difficulty"]
        text = item["text"]

        # Word count check
        word_count = len(text.split())
        if diff == "beginner":
            assert 2 <= word_count <= 4, f"Beginner word count mismatch in '{text}' ({word_count})"
        elif diff == "intermediate":
            assert 5 <= word_count <= 8, f"Intermediate word count mismatch in '{text}' ({word_count})"
        elif diff == "advanced":
            assert 9 <= word_count <= 15, f"Advanced word count mismatch in '{text}' ({word_count})"

        # Run translation to derive signs
        res = translate_to_sign(text)
        sign_ids = [tok["sign_id"] for tok in res.get("tokens", [])]
        # Also collect gloss words
        gloss_words = [tok["word"] for tok in res.get("tokens", [])]

        entry = {
            "id": f"sent_{idx:03d}",
            "text": text,
            "category": cat,
            "difficulty": diff,
            "word_count": word_count,
            "signs": sign_ids,
            "gloss": " ".join(gloss_words)
        }
        formatted.append(entry)

        category_counts[cat] = category_counts.get(cat, 0) + 1
        difficulty_counts[diff] += 1

    print(f"Total Sentences: {len(formatted)}")
    print("Categories:")
    for cat, cnt in category_counts.items():
        print(f"  - {cat}: {cnt} sentences")
    print("Difficulties:")
    for d, cnt in difficulty_counts.items():
        print(f"  - {d}: {cnt} sentences")

    # Save to assets/data/practice_sentences.json
    out_path = os.path.join("assets", "data", "practice_sentences.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(formatted, f, indent=2, ensure_ascii=False)
    print(f"Saved: {out_path}")

    # Also save to root sentences.json for convenience
    root_path = "sentences.json"
    with open(root_path, "w", encoding="utf-8") as f:
        json.dump(formatted, f, indent=2, ensure_ascii=False)
    print(f"Saved: {root_path}")

if __name__ == "__main__":
    generate()

