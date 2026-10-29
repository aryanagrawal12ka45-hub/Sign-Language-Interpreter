import urllib.request
import json

sample_sentences = [
    ('Greetings and introductions', 'Hello friend'),
    ('Daily routine', 'I wake up early every morning'),
    ('Family and friends', 'My family lives in a city'),
    ('School and college', 'The teacher is in the classroom'),
    ('Food and drinks', 'Please give me cold drinking water'),
    ('Health and emergencies', 'In case of emergency please call the doctor and police immediately'),
    ('Travel and directions', 'The bus is coming to stop'),
    ('Shopping and money', 'How much does this book cost'),
    ('Feelings and emotions', 'I was very tired after work but happy to be back home'),
    ('Questions (who, what, where, when, why, how)', 'Why are you standing outside when you can come in and sit'),
    ('Time, days, weather', 'It is very cold outside today so please wear warm clothes')
]

print("=== TESTING 11 SENTENCES ACROSS CATEGORIES OVER HTTP ===\n")
for cat, text in sample_sentences:
    req = urllib.request.Request(
        'http://localhost:8000/api/translate-to-sign',
        data=json.dumps({'text': text}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        tokens = res.get('tokens', [])
        sign_types = [t['type'] for t in tokens]
        words = [t['word'] for t in tokens]
        print(f"[{cat}]")
        print(f"Input: \"{text}\"")
        preview = " ".join(words[:12]) + ("..." if len(words) > 12 else "")
        print(f"Tokens ({len(tokens)}): {preview}")
        print(f"Types: {sign_types.count('sign')} signs, {sign_types.count('fingerspell')} fingerspelled letters\n")

