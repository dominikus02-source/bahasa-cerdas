from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import math

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ── Premium Palette ──
BG_DARK   = RGBColor(0x0B, 0x0E, 0x17)
BG_CARD   = RGBColor(0x14, 0x1A, 0x2A)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GRAY      = RGBColor(0x9C, 0xA3, 0xAF)
GRAY_DIM  = RGBColor(0x4B, 0x55, 0x63)
TEAL      = RGBColor(0x2D, 0xD4, 0xBF)
TEAL_DARK = RGBColor(0x0F, 0x76, 0x6A)
VIOLET    = RGBColor(0x8B, 0x5C, 0xF6)
VIOLET_DIM= RGBColor(0x7C, 0x3A, 0xED)
GOLD      = RGBColor(0xF5, 0x9E, 0x0B)
GREEN     = RGBColor(0x10, 0xB9, 0x81)
RED       = RGBColor(0xEF, 0x44, 0x44)

def new_slide():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG_DARK
    return slide

def rect(slide, l, t, w, h, fill, radius=None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h) if radius else \
        slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    s.line.fill.background()
    return s

def txt(slide, l, t, w, h, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    if anchor:
        tf.paragraphs[0].alignment = align
        box.text_frame.auto_size = None
    try:
        tf.paragraphs[0].alignment = align
    except:
        pass
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = "Calibri"
    return tf

def multi_txt(slide, l, t, w, h, lines, size=16, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    """lines is list of (text, size_override, color_override, bold_override)"""
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(lines):
        text = item[0]
        sz = item[1] if len(item)>1 else size
        cl = item[2] if len(item)>2 else color
        bl = item[3] if len(item)>3 else bold
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = text
        p.font.size = Pt(sz)
        p.font.color.rgb = cl
        p.font.bold = bl
        p.font.name = "Calibri"
        p.alignment = align
        p.space_before = Pt(2)
        p.space_after = Pt(2)
    return tf

def acc_bar(slide, top=Inches(0)):
    rect(slide, Inches(0), top, Inches(0.2), Inches(7.5), TEAL)
    rect(slide, Inches(0.2), top, Inches(0.08), Inches(7.5), VIOLET)

def section_label(slide, text, top=Inches(0.5)):
    txt(slide, Inches(1), top, Inches(4), Inches(0.5), text, size=13, color=TEAL, bold=True)

def slide_title(slide, text, top=Inches(1.1)):
    txt(slide, Inches(1), top, Inches(11), Inches(0.9), text, size=42, color=WHITE, bold=True)

def footer(slide, num, total=12):
    txt(slide, Inches(11.5), Inches(6.9), Inches(1.3), Inches(0.4),
        f"{num:02d} / {total:02d}", size=11, color=GRAY_DIM, align=PP_ALIGN.RIGHT)

# ═══════════════════════════════════════
# SLIDE 1 — COVER
# ═══════════════════════════════════════
s = new_slide()
rect(s, Inches(0), Inches(0), Inches(13.333), Inches(7.5), RGBColor(0x06, 0x09, 0x12))
# Large decorative circle top-right
sh = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9), Inches(-2), Inches(7), Inches(7))
sh.fill.solid(); sh.fill.fore_color.rgb = TEAL
sh.line.fill.background()
sh.fill.fore_color.brightness = 0.0
# Smaller circle
sh2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-1.5), Inches(4.5), Inches(5), Inches(5))
sh2.fill.solid(); sh2.fill.fore_color.rgb = VIOLET
sh2.line.fill.background()

txt(s, Inches(1.5), Inches(1.8), Inches(8), Inches(1.2),
    "BAHASACERDAS", size=64, color=WHITE, bold=True)
txt(s, Inches(1.5), Inches(2.8), Inches(7), Inches(0.6),
    "The Social-Creative Platform for\nBahasa Indonesia Education", size=26, color=TEAL)
txt(s, Inches(1.5), Inches(4.2), Inches(7), Inches(1.5),
    "Seed Round  •  EdTech  •  Indonesia\n"
    "Transforming how 63M+ students learn, write, and love their national language\n"
    "through gamification, AI-powered feedback, and social creativity.",
    size=14, color=GRAY)
txt(s, Inches(1.5), Inches(6.2), Inches(4), Inches(0.4),
    "dominikus@bahasacerdas.com  |  bahasacerdas.com", size=12, color=GRAY_DIM)

# ═══════════════════════════════════════
# SLIDE 2 — PROBLEM
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "THE PROBLEM")
slide_title(s, "Bahasa Indonesia education is broken")

# 3 stat cards
stats = [
    ("63M+", "students forced to\nmemorize, not create", "Rote learning kills\ncreative expression", TEAL),
    ("70%", "teachers lack modern\ndigital tools", "No engaging resources\nfor Bahasa classes", VIOLET),
    ("#1", "least favorite subject\nin Indonesian schools", "Students find it boring\nand irrelevant", GOLD),
]
for i, (num, title, desc, color) in enumerate(stats):
    x = Inches(1.2 + i * 3.8)
    rect(s, x, Inches(2.3), Inches(3.3), Inches(2.8), BG_CARD)
    # Accent top bar
    rect(s, x, Inches(2.3), Inches(3.3), Inches(0.08), color)
    txt(s, Inches(x + 0.3), Inches(2.6), Inches(2.7), Inches(0.7), num, size=42, color=color, bold=True)
    txt(s, Inches(x + 0.3), Inches(3.3), Inches(2.7), Inches(0.6), title, size=15, color=WHITE, bold=True)
    txt(s, Inches(x + 0.3), Inches(3.9), Inches(2.7), Inches(0.6), desc, size=12, color=GRAY)

# Consequence box
rect(s, Inches(1.2), Inches(5.5), Inches(11.2), Inches(1.6), BG_CARD)
txt(s, Inches(1.5), Inches(5.6), Inches(10.5), Inches(0.3), "⚠  CONSEQUENCES", size=13, color=GOLD, bold=True)
cons = [
    "Indonesia's PISA reading scores rank among the lowest globally — literacy is declining",
    "Students graduate unable to write a coherent essay, let alone a poem or story",
    "No platform exists that makes Bahasa Indonesia social, fun, or creatively fulfilling",
]
for j, c in enumerate(cons):
    txt(s, Inches(1.5), Inches(6.0 + j * 0.35), Inches(10), Inches(0.3),
        f"  {c}", size=12, color=GRAY)

footer(s, 2)

# ═══════════════════════════════════════
# SLIDE 3 — SOLUTION
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "THE SOLUTION")
slide_title(s, "Where creativity meets gamification")

# Two-column layout
# Student side
rect(s, Inches(1), Inches(2.3), Inches(5.5), Inches(4.8), BG_CARD)
rect(s, Inches(1), Inches(2.3), Inches(5.5), Inches(0.08), VIOLET)
txt(s, Inches(1.3), Inches(2.5), Inches(5), Inches(0.5), "🎓  FOR STUDENTS", size=20, color=VIOLET, bold=True)
stud = [
    "Write daily across 6 genres: puisi, cerpen, artikel,",
    "  anekdot, pantun, opini — with AI grammar feedback",
    "Social-style portfolio: Behance for writing",
    "Earn Coin Cerdas through writing, commenting, liking",
    "Weekly leagues: compete with 30 peers, promote/demote",
    "Game battles: real-time quiz & word challenges",
]
for j, line in enumerate(stud):
    txt(s, Inches(1.3), Inches(3.2 + j * 0.55), Inches(4.8), Inches(0.4),
        f"✓  {line}" if line.startswith("  ") else f"✓  {line}", size=13, color=GRAY if line.startswith("  ") else WHITE)

# Teacher side
rect(s, Inches(6.8), Inches(2.3), Inches(5.5), Inches(4.8), BG_CARD)
rect(s, Inches(6.8), Inches(2.3), Inches(5.5), Inches(0.08), TEAL)
txt(s, Inches(7.1), Inches(2.5), Inches(5), Inches(0.5), "👩‍🏫  FOR TEACHERS", size=20, color=TEAL, bold=True)
teach = [
    "Grade-level content: VII–XII, all semesters, ready to use",
    "AI question generator by KD, difficulty, topic",
    "Auto-gradebook with A-E scoring & CSV export",
    "Marketplace: sell RPP, Modul, PPT, Soal, Video",
    "Class management: assignments, tracking, reports",
]
for j, line in enumerate(teach):
    txt(s, Inches(7.1), Inches(3.2 + j * 0.55), Inches(4.8), Inches(0.4),
        f"✓  {line}", size=13, color=WHITE)

footer(s, 3)

# ═══════════════════════════════════════
# SLIDE 4 — WHY NOW
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "WHY NOW")
slide_title(s, "Perfect timing: four converging tailwinds")

winds = [
    ("📱", "300M+ Smartphone Users",
     "One of the highest mobile penetrations globally.\nGen Z spends 6+ hours daily on their phones."),
    ("📚", "Merdeka Curriculum Mandate",
     "Government requires project-based learning &\ncreative writing. Schools must adapt now."),
    ("💰", "EdTech Market Boom",
     "Indonesian EdTech projected to reach $8B by 2027.\nPost-COVID digital adoption is accelerating."),
    ("🏆", "No Dominant Player",
     "Competitors focus on STEM (Ruangguru, Zenius) or\nEnglish (Duolingo). Bahasa is white space."),
]
for i, (icon, title, desc) in enumerate(winds):
    x = Inches(1.2 + i * 3)
    y = Inches(2.3)
    rect(s, x, y, Inches(2.6), Inches(4.5), BG_CARD)
    txt(s, Inches(x + 0.3), Inches(y + 0.3), Inches(2), Inches(0.5), icon, size=30)
    txt(s, Inches(x + 0.3), Inches(y + 0.9), Inches(2), Inches(0.5), title, size=16, color=WHITE, bold=True)
    txt(s, Inches(x + 0.3), Inches(y + 1.6), Inches(2), Inches(2.5), desc, size=12, color=GRAY)

footer(s, 4)

# ═══════════════════════════════════════
# SLIDE 5 — MARKET
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "MARKET SIZE")
slide_title(s, "Large and growing addressable market")

# TAM SAM SOM with visual scale
segments = [
    ("TAM", "$12.8B", "Total Addressable Market", "All 63M K-12 students × education spend", TEAL, Inches(11)),
    ("SAM", "$2.1B",  "Serviceable Addressable Market", "Digital-savvy students & teachers in urban areas", VIOLET, Inches(8.5)),
    ("SOM", "$180M", "Serviceable Obtainable Market", "Realistic 3-5 year capture", GOLD, Inches(5.5)),
]
for i, (label, val, title, desc, color, width) in enumerate(segments):
    x = Inches(1 + i * 4)
    y = Inches(2.3)
    rect(s, x, y, Inches(3.3), Inches(3.5), BG_CARD)
    txt(s, Inches(x + 0.3), Inches(y + 0.2), Inches(2.7), Inches(0.3), label, size=12, color=color, bold=True)
    txt(s, Inches(x + 0.3), Inches(y + 0.5), Inches(2.7), Inches(0.7), val, size=44, color=color, bold=True)
    # Visual bar
    rect(s, Inches(x + 0.3), Inches(y + 1.2), Inches(2.5), Inches(0.06), color)
    txt(s, Inches(x + 0.3), Inches(y + 1.4), Inches(2.7), Inches(0.4), title, size=15, color=WHITE, bold=True)
    txt(s, Inches(x + 0.3), Inches(y + 1.9), Inches(2.7), Inches(0.8), desc, size=11, color=GRAY)

# Insight box
rect(s, Inches(1), Inches(6.2), Inches(11.2), Inches(0.9), BG_CARD)
txt(s, Inches(1.3), Inches(6.3), Inches(10.5), Inches(0.6),
    "💡  Bahasa Indonesia is a mandatory subject K-12 with 100% school penetration — "
    "yet no dedicated platform exists for creative writing in the language.",
    size=12, color=TEAL)

footer(s, 5)

# ═══════════════════════════════════════
# SLIDE 6 — PRODUCT OVERVIEW
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "PRODUCT")
slide_title(s, "One platform, two-sided ecosystem")

features = [
    ("✍️", "Creative Writing", "6 genres, AI feedback,\nportfolio & social feed"),
    ("🎮", "Game-Based Learning", "Quiz battles, matchmaking,\nweekly leagues & XP"),
    ("📖", "Curriculum Content", "VII–XII, all semesters,\nexercises & quizzes"),
    ("💰", "Creator Marketplace", "80/20 commission,\nMidtrans payments, premium"),
]
for i, (icon, title, desc) in enumerate(features):
    x = Inches(1 + i * 3.1)
    y = Inches(2.3)
    rect(s, x, y, Inches(2.7), Inches(3.0), BG_CARD)
    rect(s, x, y, Inches(2.7), Inches(0.06), TEAL if i % 2 == 0 else VIOLET)
    txt(s, Inches(x + 0.3), Inches(y + 0.3), Inches(2.1), Inches(0.5), icon, size=32)
    txt(s, Inches(x + 0.3), Inches(y + 0.9), Inches(2.1), Inches(0.4), title, size=18, color=WHITE, bold=True)
    txt(s, Inches(x + 0.3), Inches(y + 1.4), Inches(2.1), Inches(1.0), desc, size=12, color=GRAY)

# Stats row
stats_data = [
    ("52+", "Database\nModels"),
    ("21,600+", "Content\nItems"),
    ("4", "Game\nModes"),
    ("12", "Grade\nLevels"),
    ("57K+", "Lines of\nCode"),
]
for i, (num, label) in enumerate(stats_data):
    x = Inches(1 + i * 2.4)
    y = Inches(5.8)
    rect(s, x, y, Inches(2), Inches(1.3), BG_CARD)
    txt(s, Inches(x), Inches(y + 0.1), Inches(2), Inches(0.5), num, size=22, color=TEAL, bold=True, align=PP_ALIGN.CENTER)
    txt(s, Inches(x), Inches(y + 0.6), Inches(2), Inches(0.5), label, size=10, color=GRAY, align=PP_ALIGN.CENTER)

footer(s, 6)

# ═══════════════════════════════════════
# SLIDE 7 — TRACTION
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "TRACTION")
slide_title(s, "Early validation with strong retention")

metrics = [
    ("500+", "Active Students", "15+ schools in first 3 months", TEAL),
    ("50+", "Active Teachers", "Creating & assigning daily", VIOLET),
    ("4,000+", "Karya Created", "Poems, stories, articles", TEAL),
    ("15,000+", "Quiz Sessions", "Game sessions completed", VIOLET),
    ("85%", "Weekly Retention", "Students coming back", GOLD),
]
for i, (num, title, desc, color) in enumerate(metrics):
    x = Inches(0.8 + i * 2.5)
    y = Inches(2.3)
    rect(s, x, y, Inches(2.2), Inches(2.8), BG_CARD)
    rect(s, x, y, Inches(2.2), Inches(0.06), color)
    txt(s, Inches(x + 0.2), Inches(y + 0.3), Inches(1.8), Inches(0.6), num, size=36, color=color, bold=True, align=PP_ALIGN.CENTER)
    txt(s, Inches(x + 0.2), Inches(y + 0.9), Inches(1.8), Inches(0.3), title, size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(s, Inches(x + 0.2), Inches(y + 1.4), Inches(1.8), Inches(0.6), desc, size=11, color=GRAY, align=PP_ALIGN.CENTER)

# Growth channels
rect(s, Inches(1), Inches(5.5), Inches(11.2), Inches(1.6), BG_CARD)
txt(s, Inches(1.3), Inches(5.6), Inches(10.5), Inches(0.3), "📈  GROWTH ENGINE", size=13, color=TEAL, bold=True)
channels = [
    "Word-of-mouth: teachers invite other teachers at MGMP (subject teacher) meetings",
    "School partnerships: 3 pilot schools fully onboarded, 12 in pipeline",
    "Content flywheel: student karya shared on social media drives organic sign-ups",
]
for j, ch in enumerate(channels):
    txt(s, Inches(1.5), Inches(6.0 + j * 0.35), Inches(10), Inches(0.3),
        f"  {ch}", size=12, color=GRAY)

footer(s, 7)

# ═══════════════════════════════════════
# SLIDE 8 — BUSINESS MODEL
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "BUSINESS MODEL")
slide_title(s, "7 diversified revenue streams")

streams = [
    ("Premium Guru", "Rp 49K/mo", "× 30K teachers = Rp 1.47B/mo", TEAL),
    ("Premium Murid", "Rp 15K/mo", "× 35K students = Rp 525M/mo", VIOLET),
    ("Marketplace", "15% commission", "Teacher creator economy", GOLD),
    ("Seminar & Training", "Rp 100K/seat", "Teacher workshops & cert", TEAL),
]
for i, (name, price, desc, color) in enumerate(streams):
    x = Inches(1 + i * 3.1)
    rect(s, x, Inches(2.3), Inches(2.7), Inches(2.2), BG_CARD)
    rect(s, x, Inches(2.3), Inches(2.7), Inches(0.06), color)
    txt(s, Inches(x + 0.2), Inches(2.5), Inches(2.3), Inches(0.3), name, size=14, color=color, bold=True)
    txt(s, Inches(x + 0.2), Inches(2.9), Inches(2.3), Inches(0.4), price, size=20, color=WHITE, bold=True)
    txt(s, Inches(x + 0.2), Inches(3.4), Inches(2.3), Inches(0.6), desc, size=10, color=GRAY)

streams2 = [
    ("Advertisement", "Rp 250M/mo", "CPM + sponsored content", VIOLET),
    ("B2B Licensing", "Rp 200M/mo", "School/district subscriptions", TEAL),
    ("API & Merch", "Rp 100M/mo", "White-label + premium goods", GOLD),
]
for i, (name, price, desc, color) in enumerate(streams2):
    x = Inches(1.8 + i * 3.6)
    rect(s, x, Inches(4.8), Inches(3.2), Inches(1.6), BG_CARD)
    rect(s, x, Inches(4.8), Inches(3.2), Inches(0.06), color)
    txt(s, Inches(x + 0.2), Inches(5.0), Inches(2.8), Inches(0.3), name, size=14, color=color, bold=True)
    txt(s, Inches(x + 0.2), Inches(5.4), Inches(2.8), Inches(0.4), price, size=18, color=WHITE, bold=True)
    txt(s, Inches(x + 0.2), Inches(5.8), Inches(2.8), Inches(0.3), desc, size=10, color=GRAY)

# Total
rect(s, Inches(1), Inches(6.7), Inches(11.2), Inches(0.5), TEAL)
txt(s, Inches(1), Inches(6.7), Inches(11.2), Inches(0.5),
    "M18 TOTAL MONTHLY RUN-RATE: Rp 3.14 MILIAR / BULAN",
    size=14, color=BG_DARK, bold=True, align=PP_ALIGN.CENTER)

footer(s, 8)

# ═══════════════════════════════════════
# SLIDE 9 — FINANCIALS
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "FINANCIAL HIGHLIGHTS")
slide_title(s, "Strong unit economics, clear path to scale")

# Key numbers
fin_items = [
    ("90.1%", "Gross\nMargin", "Highly scalable\nSaaS platform", TEAL),
    ("Rp 49K", "ARPU Guru\nper month", "Premium teacher\nsubscription", VIOLET),
    ("Rp 15K", "ARPU Murid\nper month", "Premium student\nsubscription", TEAL),
    ("18 Months", "Runway\n(post-seed)", "Product 40%, Growth 30%\nTeam 20%, Ops 10%", GOLD),
]
for i, (num, title, desc, color) in enumerate(fin_items):
    x = Inches(1 + i * 3.1)
    rect(s, x, Inches(2.3), Inches(2.7), Inches(3.0), BG_CARD)
    rect(s, x, Inches(2.3), Inches(2.7), Inches(0.06), color)
    txt(s, Inches(x + 0.2), Inches(2.5), Inches(2.3), Inches(0.6), num, size=34, color=color, bold=True, align=PP_ALIGN.CENTER)
    txt(s, Inches(x + 0.2), Inches(3.2), Inches(2.3), Inches(0.6), title, size=13, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(s, Inches(x + 0.2), Inches(3.9), Inches(2.3), Inches(0.8), desc, size=10, color=GRAY, align=PP_ALIGN.CENTER)

# ARR Trajectory
rect(s, Inches(1), Inches(5.7), Inches(11.2), Inches(1.5), BG_CARD)
txt(s, Inches(1.3), Inches(5.8), Inches(5), Inches(0.3), "ARR GROWTH TRAJECTORY (BASE CASE)", size=13, color=TEAL, bold=True)

arr = [("Year 1", "Rp 5.76B"), ("Year 2", "Rp 24B"), ("Year 3", "Rp 80B")]
for i, (yr, val) in enumerate(arr):
    x = Inches(1.5 + i * 3.5)
    txt(s, x, Inches(6.2), Inches(2), Inches(0.3), yr, size=12, color=GRAY)
    txt(s, x, Inches(6.5), Inches(2), Inches(0.5), val, size=26, color=TEAL, bold=True)
    if i < 2:
        txt(s, Inches(x + 1.8), Inches(6.5), Inches(1.5), Inches(0.4), "▸", size=28, color=GRAY_DIM)

footer(s, 9)

# ═══════════════════════════════════════
# SLIDE 10 — COMPETITION
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "COMPETITIVE LANDSCAPE")
slide_title(s, "Uniquely positioned at the intersection")

# Simple but effective comparison
headers = ["", "BAHASACERDAS", "Ruangguru", "Duolingo", "Zenius"]
rows_data = [
    ("Bahasa Indonesia focus",     "✅", "⚠", "❌", "⚠"),
    ("Creative writing (6 genres)", "✅", "❌", "❌", "❌"),
    ("Social portfolio feed",       "✅", "❌", "❌", "❌"),
    ("Game-based learning",         "✅", "⚠", "✅", "❌"),
    ("Teacher marketplace",         "✅", "⚠", "❌", "❌"),
    ("AI writing feedback",         "✅", "❌", "❌", "❌"),
    ("Coin economy & leagues",      "✅", "❌", "✅", "❌"),
    ("Curriculum-aligned",          "✅", "✅", "❌", "✅"),
]

row_h = Inches(0.42)
col_w = [Inches(3.3), Inches(2.0), Inches(2.0), Inches(2.0), Inches(2.0)]
col_x = [Inches(0.8)]
for w in col_w[:-1]:
    col_x.append(col_x[-1] + w)

y0 = Inches(2.2)

# Header
for j, h in enumerate(headers):
    rect(s, col_x[j], y0, col_w[j], row_h, TEAL)
    c = WHITE if j > 0 else TEAL
    txt(s, col_x[j], Inches(y0 + 0.05), col_w[j], row_h, h, size=12, color=c, bold=True, align=PP_ALIGN.CENTER)

# Rows
for i, (label, *vals) in enumerate(rows_data):
    y = y0 + (i + 1) * row_h
    bg = BG_CARD if i % 2 == 0 else RGBColor(0x10, 0x15, 0x25)
    rect(s, col_x[0], y, col_w[0], row_h, bg)
    txt(s, col_x[0], Inches(y + 0.05), col_w[0], row_h, label, size=11, color=WHITE)
    for j, v in enumerate(vals):
        rect(s, col_x[j+1], y, col_w[j+1], row_h, bg)
        cl = TEAL if v == "✅" else (GRAY_DIM if v == "❌" else GOLD)
        txt(s, col_x[j+1], Inches(y + 0.05), col_w[j+1], row_h, v, size=14, color=cl, bold=True, align=PP_ALIGN.CENTER)

footer(s, 10)

# ═══════════════════════════════════════
# SLIDE 11 — TEAM
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "THE TEAM")
slide_title(s, "Education experts building forscale")

members = [
    ("Dominikus", "Founder & CEO", "12+ years in Education Technology\nand platform building.\nEx-lecturer, built multiple\ndigital learning products.", TEAL),
    ("[Hiring]", "Chief Technology Officer", "Full-stack engineer, Next.js,\nAI/ML infrastructure.\nScalable systems for 50K+ users.", VIOLET),
    ("[Hiring]", "Head of Product", "Product designer focused on\ngamification and student\nengagement. EdTech experience\npreferred.", TEAL),
    ("[Hiring]", "Head of Content", "Master's in Bahasa Indonesia\nEducation. Curriculum design\nfor Merdeka Belajar program.", VIOLET),
]
for i, (name, role, bio, color) in enumerate(members):
    x = Inches(0.8 + i * 3.1)
    y = Inches(2.3)
    rect(s, x, y, Inches(2.7), Inches(3.5), BG_CARD)
    rect(s, x, y, Inches(2.7), Inches(0.06), color)
    txt(s, Inches(x + 0.2), Inches(y + 0.3), Inches(2.3), Inches(0.4), name, size=20, color=WHITE, bold=True)
    txt(s, Inches(x + 0.2), Inches(y + 0.7), Inches(2.3), Inches(0.5), role, size=12, color=color, bold=True)
    txt(s, Inches(x + 0.2), Inches(y + 1.2), Inches(2.3), Inches(2.0), bio, size=11, color=GRAY)

# Note
rect(s, Inches(1), Inches(6.2), Inches(11.2), Inches(0.9), BG_CARD)
txt(s, Inches(1.3), Inches(6.3), Inches(10.5), Inches(0.7),
    "🔗  Key hires post-seed: Mobile Developer, Growth Marketer, Content Specialist. "
    "Advisory board being formed with ex-Kemendikbud officials and EdTech founders.",
    size=12, color=GRAY)

footer(s, 11)

# ═══════════════════════════════════════
# SLIDE 12 — ASK + CONTACT
# ═══════════════════════════════════════
s = new_slide()
acc_bar(s)
section_label(s, "THE ASK")
slide_title(s, "Join us in building the future of\nBahasa Indonesia education", top=Inches(1.0))

# Left: Investment details
rect(s, Inches(1), Inches(2.5), Inches(7), Inches(3.5), BG_CARD)
rect(s, Inches(1), Inches(2.5), Inches(0.06), Inches(3.5), TEAL)
txt(s, Inches(1.5), Inches(2.6), Inches(6), Inches(0.4), "INVESTMENT ROUND", size=18, color=TEAL, bold=True)

ask_items = [
    ("Investment:", "Rp 4 Miliar (~$260K)"),
    ("Pre-money Valuation:", "Rp 18 Miliar (~$1.17M)"),
    ("Equity Offered:", "18.2%"),
    ("Runway:", "18 months"),
    ("Lead Investor:", "Open — first close available"),
]
for j, (label, val) in enumerate(ask_items):
    y = Inches(3.1 + j * 0.5)
    txt(s, Inches(1.5), y, Inches(2.5), Inches(0.4), label, size=14, color=GRAY)
    txt(s, Inches(4.2), y, Inches(3.5), Inches(0.4), val, size=14, color=WHITE, bold=True)

# Right: Use of funds
rect(s, Inches(8.5), Inches(2.5), Inches(3.8), Inches(3.5), BG_CARD)
rect(s, Inches(8.5), Inches(2.5), Inches(0.06), Inches(3.5), GOLD)
txt(s, Inches(9.0), Inches(2.6), Inches(3), Inches(0.4), "USE OF FUNDS", size=18, color=GOLD, bold=True)

funds = [
    ("Product Development", "40%", TEAL, Inches(2.6)),
    ("Growth & Marketing",  "30%", VIOLET, Inches(2.0)),
    ("Team Expansion",      "20%", GOLD, Inches(1.3)),
    ("Operations",          "10%", GRAY, Inches(0.7)),
]
for j, (label, pct, color, w) in enumerate(funds):
    y = Inches(3.1 + j * 0.65)
    txt(s, Inches(9.0), y, Inches(2.5), Inches(0.3), label, size=11, color=WHITE)
    rect(s, Inches(9.0), Inches(y + 0.3), w, Inches(0.12), color)
    txt(s, Inches(9.0 + 2.6), y, Inches(1), Inches(0.3), pct, size=11, color=color, bold=True)

# Contact bar
rect(s, Inches(1), Inches(6.3), Inches(11.2), Inches(0.8), TEAL)
txt(s, Inches(1.3), Inches(6.35), Inches(5), Inches(0.4),
    "📧  dominikus@bahasacerdas.com", size=16, color=BG_DARK, bold=True)
txt(s, Inches(6), Inches(6.35), Inches(5), Inches(0.4),
    "🌐  bahasacerdas.com", size=16, color=BG_DARK, bold=True)
txt(s, Inches(1.3), Inches(6.65), Inches(10), Inches(0.3),
    "📍 Jakarta, Indonesia", size=12, color=RGBColor(0x0A, 0x5A, 0x50))

footer(s, 12)

# ═══════════════════════════════════════
# SAVE
# ═══════════════════════════════════════
import os
path = os.path.expanduser("~/Documents/bahasa-cerdas/Bahasacerdas_Pitch_Deck.pptx")
prs.save(path)
print(f"✅ Saved: {path}")
print(f"   Slides: {len(prs.slides)}")
print(f"   Size: {os.path.getsize(path)/1024:.0f} KB")
