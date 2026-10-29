/**
 * Ported from Sign-Flow (https://github.com/maddyroxx/Sign-Flow)
 * License: MIT (Copyright (c) 2026 Madhav Mullick)
 *
 * Canonical ISL vocabulary definitions and sanitization utilities.
 */

export const SUPPORTED_TOKENS = Object.freeze([
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
]);

export const SUPPORTED_TOKEN_SET = new Set(SUPPORTED_TOKENS);

/** Words that deliberately use letter-by-letter fingerspelling since procedural 3D gestures are not present */
export const FINGERSPELL_ONLY_WORDS = Object.freeze([
  'DAY', 'NIGHT', 'WEATHER', 'RAIN', 'HOT', 'COLD', 'SUN', 'CLOUD', 'WIND', 'STORM',
  'TODAY', 'TOMORROW', 'YESTERDAY', 'WEEK', 'MONTH', 'YEAR', 'AFTERNOON', 'EVENING',
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST',
  'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'AMIT', 'PRIYA', 'RAHUL', 'JOHN', 'DELHI', 'MUMBAI', 'INDIA'
]);

export const SYNONYM_MAP = Object.freeze({
  hi: 'hello', hey: 'hello', greetings: 'hello',
  thanks: 'thank you', thankyou: 'thank you', tysm: 'thank you',
  bye: 'good', goodbye: 'good',
  mom: 'mother', mummy: 'mother', mama: 'mother',
  dad: 'father', papa: 'father', daddy: 'father',
  bro: 'brother', sis: 'sister',
  kid: 'child', kids: 'child', children: 'child',
  pal: 'friend', buddy: 'friend', buddies: 'friend',
  store: 'shop', stores: 'shop', supermarket: 'shop',
  physician: 'doctor', medic: 'doctor',
  clinic: 'hospital', infirmary: 'hospital',
  cab: 'car', taxi: 'car', auto: 'car', vehicle: 'car',
  coach: 'bus', metro: 'train', railway: 'train',
  glad: 'happy', joyful: 'happy', delighted: 'happy', cheerful: 'happy',
  unhappy: 'sad', upset: 'sad', sorrow: 'sad',
  mad: 'angry', furious: 'angry', irritated: 'angry',
  afraid: 'scared', fearful: 'scared', frightened: 'scared',
  exhausted: 'tired', sleepy: 'tired', weary: 'tired',
  meal: 'food', snack: 'food', dish: 'food',
  beverage: 'drink', sip: 'drink',
  aqua: 'water', roti: 'bread', toast: 'bread', supper: 'dinner',
  assist: 'help', assistance: 'help', ache: 'pain', hurt: 'pain', sore: 'pain',
  street: 'road', path: 'road', lane: 'road', highway: 'road',
  cost: 'how much', price: 'how much', rate: 'how much',
  count: 'how many', quantity: 'how many',
  purse: 'bag', backpack: 'bag', sack: 'bag',
  clothing: 'clothes', dress: 'clothes', garments: 'clothes',
  town: 'city', garden: 'park', bazaar: 'market',
  pc: 'computer', laptop: 'computer',
  cellphone: 'mobile', smartphone: 'mobile', telephone: 'phone',
  clock: 'time', hour: 'time', timing: 'time',
  prompt: 'early', ahead: 'early', delayed: 'late',
  urgent: 'emergency', crisis: 'emergency', hazard: 'danger', risky: 'danger',
  secure: 'safe', safety: 'safe', halt: 'stop',
  reside: 'live', recall: 'remember', ponder: 'think',
  trust: 'believe', faith: 'believe', care: 'love', adore: 'love',
  enjoy: 'like', prefer: 'like', prepared: 'ready'
});

export const DIGIT_MAP = Object.freeze({
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten'
});

/** A single A–Z letter, i.e. a fingerspelling instruction. */
export function isFingerspellToken(token) {
  return typeof token === 'string' && /^[A-Z]$/.test(token);
}

/** True when the avatar can play this token directly. */
export function isPlayableToken(token) {
  return SUPPORTED_TOKEN_SET.has(token) || isFingerspellToken(token);
}

/**
 * Coerce an arbitrary token list into tokens the avatar can always play:
 * supported signs are kept as-is; unsupported words or names are expanded
 * into individual letters for A-Z fingerspelling.
 */
export function sanitizeTokens(input) {
  if (!Array.isArray(input)) return [];
  const output = [];
  for (const entry of input) {
    const normalized = String(entry ?? '').trim().toUpperCase().replace(/[-\s]+/g, '_');
    const token = normalized.replace(/[^A-Z_]/g, '');
    if (!token) continue;
    if (SUPPORTED_TOKEN_SET.has(token) || token.length === 1) {
      output.push(token);
      continue;
    }
    for (const letter of token.replace(/_/g, '')) {
      if (letter) output.push(letter);
    }
  }
  return output;
}

/** True when every whitespace-separated token is already avatar-playable. */
export function looksPreTranslated(text) {
  if (!text || typeof text !== 'string') return false;
  const tokens = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isPlayableToken);
}

