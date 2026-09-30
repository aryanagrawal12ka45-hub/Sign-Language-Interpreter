import os
import re
import xml.etree.ElementTree as ET

os.makedirs('assets/signs', exist_ok=True)
os.makedirs('assets/images', exist_ok=True)

# Parse master chart
chart_path = 'assets/signs/asl_chart_combined.svg'
tree = ET.parse(chart_path)
root = tree.getroot()

def get_path_bbox(d_str):
    commands = re.findall(r'([a-df-zA-DF-Z])([^a-df-zA-DF-Z]*)', d_str)
    cur_x, cur_y = 0.0, 0.0
    pts = []
    for cmd, args_str in commands:
        nums = [float(n) for n in re.findall(r'[-+]?(?:\d*\.\d+|\d+)', args_str)]
        is_rel = cmd.islower()
        cmd_upper = cmd.upper()
        if cmd_upper in ['M', 'L']:
            for i in range(0, len(nums) - 1, 2):
                x, y = nums[i], nums[i+1]
                if is_rel: cur_x += x; cur_y += y
                else: cur_x = x; cur_y = y
                pts.append((cur_x, cur_y))
        elif cmd_upper in ['C', 'S', 'Q', 'T']:
            for i in range(0, len(nums) - 1, 2):
                x, y = nums[i], nums[i+1]
                px = cur_x + x if is_rel else x
                py = cur_y + y if is_rel else y
                pts.append((px, py))
            if nums:
                if is_rel: cur_x += nums[-2]; cur_y += nums[-1]
                else: cur_x = nums[-2]; cur_y = nums[-1]
    if not pts:
        return 0, 0, 10, 10
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def parse_transform(tf_str):
    if not tf_str:
        return 1.0, 0.0, 0.0, 1.0, 0.0, 0.0
    m = re.search(r'matrix\(([^)]+)\)', tf_str)
    if m:
        parts = [float(x.strip()) for x in m.group(1).split(',')]
        return parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
    return 1.0, 0.0, 0.0, 1.0, 0.0, 0.0

# Extract character groups
char_map = {}
for g in root.iter('{http://www.w3.org/2000/svg}g'):
    gid = g.attrib.get('id', '')
    if not gid.startswith('g5'):
        continue
    for t in g.iter('{http://www.w3.org/2000/svg}tspan'):
        txt = (t.text or '').strip().upper()
        if txt and (len(txt) == 1):
            char_map[txt] = g
            break

print(f"Mapped {len(char_map)} standard characters (Letters A-Z & Numbers 0-9)")

# Generate individual SVGs
for char, g in char_map.items():
    tf = g.attrib.get('transform', '')
    a, b, c, d, e, f = parse_transform(tf)
    
    # Calculate group bbox from paths only (exclude text)
    all_min_x, all_min_y, all_max_x, all_max_y = float('inf'), float('inf'), float('-inf'), float('-inf')
    paths_xml = []
    
    for p in g.iter('{http://www.w3.org/2000/svg}path'):
        p_d = p.attrib.get('d', '')
        if not p_d:
            continue
        p_min_x, p_min_y, p_max_x, p_max_y = get_path_bbox(p_d)
        all_min_x = min(all_min_x, p_min_x)
        all_min_y = min(all_min_y, p_min_y)
        all_max_x = max(all_max_x, p_max_x)
        all_max_y = max(all_max_y, p_max_y)
        
        # Strip ns0 namespace for standalone SVG
        p_clean = ET.tostring(p, encoding='unicode')
        p_clean = re.sub(r'ns0:', '', p_clean)
        p_clean = re.sub(r'xmlns:ns0="[^"]*"', '', p_clean)
        paths_xml.append(p_clean)
        
    if all_min_x == float('inf'):
        continue
        
    # Transform bbox
    t_min_x = a * all_min_x + e
    t_max_x = a * all_max_x + e
    t_min_y = d * all_min_y + f
    t_max_y = d * all_max_y + f
    
    w = t_max_x - t_min_x
    h = t_max_y - t_min_y
    dim = max(w, h)
    pad = dim * 0.15
    dim += pad * 2
    
    center_x = (t_min_x + t_max_x) / 2
    center_y = (t_min_y + t_max_y) / 2
    
    vb_x = center_x - dim / 2
    vb_y = center_y - dim / 2
    
    # Standalone SVG output
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x:.2f} {vb_y:.2f} {dim:.2f} {dim:.2f}" width="100%" height="100%">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g transform="{tf}" filter="url(#shadow)">
    {''.join(paths_xml)}
  </g>
</svg>'''
    
    filename = f"assets/signs/{char}.svg"
    with open(filename, 'w', encoding='utf-8') as out_f:
        out_f.write(svg_content)

print("Generated individual Letter and Number SVGs.")

# Generate SVGs for Common Signs using mapped handshapes or bespoke vector graphics
SIGN_MAPPINGS = {
    'PEACE': 'V',
    'OK': 'F',
    'FIST': 'S',
    'OPEN_PALM': '5',
    'THUMBS_UP': 'THUMBS_UP',
    'THUMBS_DOWN': 'THUMBS_DOWN',
    'I_LOVE_YOU': 'I_LOVE_YOU',
    'ROCK_ON': 'ROCK_ON',
    'YES': 'YES',
    'HELLO': 'HELLO'
}

# 1. Aliased signs (PEACE from V, OK from F, FIST from S, OPEN_PALM from 5)
for sign_name, src_char in [('PEACE', 'V'), ('OK', 'F'), ('FIST', 'S'), ('OPEN_PALM', '5')]:
    src_file = f"assets/signs/{src_char}.svg"
    if os.path.exists(src_file):
        with open(src_file, 'r', encoding='utf-8') as sf:
            content = sf.read()
        with open(f"assets/signs/{sign_name}.svg", 'w', encoding='utf-8') as tf:
            tf.write(content)

# 2. Bespoke high-quality vector illustrations for unique signs
# THUMBS_UP
thumbs_up_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffcaa4"/>
      <stop offset="100%" stop-color="#e8986c"/>
    </linearGradient>
  </defs>
  <!-- Wrist / Palm -->
  <path d="M35 55 L35 85 Q35 90 45 90 L65 90 Q75 90 75 85 L75 55 Z" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Curled Fingers -->
  <path d="M55 52 C72 52 74 60 72 63 C70 66 55 66 55 66" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5"/>
  <path d="M55 63 C72 63 74 71 72 74 C70 77 55 77 55 77" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5"/>
  <path d="M55 74 C70 74 72 82 70 85 C68 87 55 87 55 87" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Index curled -->
  <path d="M40 50 C40 45 65 44 68 50 C70 54 62 58 50 56" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Extended Upright Thumb -->
  <path d="M35 58 C32 50 33 22 42 16 C48 12 55 18 52 30 C49 42 50 48 50 56 Z" fill="url(#skin)" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Thumbnail -->
  <path d="M41 22 C43 18 49 18 50 22 C51 26 43 27 41 22 Z" fill="#fff" opacity="0.6"/>
</svg>'''
with open("assets/signs/THUMBS_UP.svg", 'w', encoding='utf-8') as f:
    f.write(thumbs_up_svg)

# THUMBS_DOWN (Inverted thumb)
thumbs_down_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <g transform="translate(100, 100) rotate(180)">
    <!-- Wrist / Palm -->
    <path d="M35 55 L35 85 Q35 90 45 90 L65 90 Q75 90 75 85 L75 55 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Curled Fingers -->
    <path d="M55 52 C72 52 74 60 72 63 C70 66 55 66 55 66" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M55 63 C72 63 74 71 72 74 C70 77 55 77 55 77" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M55 74 C70 74 72 82 70 85 C68 87 55 87 55 87" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <!-- Index curled -->
    <path d="M40 50 C40 45 65 44 68 50 C70 54 62 58 50 56" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <!-- Extended Upright Thumb (Inverted to down) -->
    <path d="M35 58 C32 50 33 22 42 16 C48 12 55 18 52 30 C49 42 50 48 50 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  </g>
</svg>'''
with open("assets/signs/THUMBS_DOWN.svg", 'w', encoding='utf-8') as f:
    f.write(thumbs_down_svg)

# I_LOVE_YOU (Thumb + Index + Pinky extended)
ily_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Wrist -->
  <path d="M36 68 L36 92 L64 92 L64 68 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Palm -->
  <path d="M32 50 L32 72 Q50 78 68 72 L68 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Middle & Ring Curled -->
  <path d="M44 48 C44 58 56 58 56 48 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2.5"/>
  <path d="M56 48 C56 58 66 58 66 48 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Extended Thumb -->
  <path d="M32 56 C22 52 14 50 12 42 C10 36 20 34 26 42 C30 46 34 50 36 54 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Extended Index -->
  <path d="M34 50 L34 16 C34 10 44 10 44 16 L44 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Extended Pinky -->
  <path d="M66 50 L66 22 C66 16 76 16 76 22 L76 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
</svg>'''
with open("assets/signs/I_LOVE_YOU.svg", 'w', encoding='utf-8') as f:
    f.write(ily_svg)

# ROCK_ON (Index + Pinky extended, thumb folds middle & ring)
rock_on_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Wrist -->
  <path d="M36 68 L36 92 L64 92 L64 68 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Palm -->
  <path d="M32 50 L32 72 Q50 78 68 72 L68 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Middle & Ring Curled with Thumb across -->
  <path d="M44 48 C44 58 56 58 56 48 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2.5"/>
  <path d="M56 48 C56 58 66 58 66 48 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Folded Thumb over knuckles -->
  <path d="M30 56 C34 46 54 48 58 54 C56 58 40 62 30 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
  <!-- Extended Index -->
  <path d="M34 50 L34 16 C34 10 44 10 44 16 L44 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Extended Pinky -->
  <path d="M66 50 L66 22 C66 16 76 16 76 22 L76 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5" stroke-linejoin="round"/>
</svg>'''
with open("assets/signs/ROCK_ON.svg", 'w', encoding='utf-8') as f:
    f.write(rock_on_svg)

# YES (Nodding fist)
yes_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Fist -->
  <g transform="translate(10, 5)">
    <path d="M30 50 C25 45 25 35 35 30 C45 25 55 25 65 32 C72 38 72 50 68 62 L60 80 L35 80 L30 65 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M32 38 C42 34 58 38 60 46" stroke="#2b1a10" stroke-width="2" fill="none"/>
    <path d="M33 48 C42 44 56 46 58 54" stroke="#2b1a10" stroke-width="2" fill="none"/>
    <!-- Thumb across -->
    <path d="M26 48 C28 38 46 40 48 48 C48 54 36 56 26 48 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2.5"/>
    <!-- Motion arrows for nodding up/down -->
    <path d="M78 35 L78 55 M74 40 L78 35 L82 40 M74 50 L78 55 L82 50" stroke="#76bd9b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>'''
with open("assets/signs/YES.svg", 'w', encoding='utf-8') as f:
    f.write(yes_svg)

# HELLO (Salute gesture from brow moving outward)
hello_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Open Hand in Salute -->
  <g transform="translate(5, 5)">
    <path d="M32 52 L32 78 L52 78 L52 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <!-- 4 Fingers Flat Upright -->
    <path d="M32 52 L32 20 C32 14 40 14 40 20 L40 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M40 50 L40 16 C40 10 48 10 48 16 L48 50 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M48 50 L48 18 C48 12 56 12 56 18 L56 52 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <path d="M56 52 L56 24 C56 18 64 18 64 24 L64 56 Z" fill="#ffcaa4" stroke="#2b1a10" stroke-width="2.5"/>
    <!-- Thumb Folded -->
    <path d="M32 54 C34 48 44 48 46 54 C46 58 38 62 32 58 Z" fill="#e8986c" stroke="#2b1a10" stroke-width="2"/>
    <!-- Outward Wave Motion Arc -->
    <path d="M68 28 C78 30 84 38 86 48" stroke="#8aa8ff" stroke-width="3" stroke-linecap="round" fill="none"/>
    <polyline points="82,46 86,49 89,44" stroke="#8aa8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>'''
with open("assets/signs/HELLO.svg", 'w', encoding='utf-8') as f:
    f.write(hello_svg)

print("Generated all Common Sign SVGs (PEACE, OK, THUMBS_UP, THUMBS_DOWN, I_LOVE_YOU, ROCK_ON, OPEN_PALM, FIST, YES, HELLO).")
