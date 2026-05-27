#!/usr/bin/env python3
"""Generate BahasaCerdas Investor Pitch Deck (PPTX)"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Brand colors
EMERALD = RGBColor(0x10, 0xB9, 0x81)
EMERALD_DARK = RGBColor(0x06, 0x5F, 0x46)
VIOLET = RGBColor(0x8B, 0x5C, 0xF6)
VIOLET_DARK = RGBColor(0x5B, 0x21, 0xD6)
DARK = RGBColor(0x1E, 0x29, 0x3B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xF3, 0xF4, 0xF6)
GRAY = RGBColor(0x94, 0xA3, 0xB8)
GOLD = RGBColor(0xF5, 0x9E, 0x0B)

def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape(slide, left, top, width, height, fill_color, line_color=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if line_color:
        shape.line.color.rgb = line_color
    else:
        shape.line.fill.background()
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=18, color=DARK, bold=False, alignment=PP_ALIGN.LEFT, font_name="Calibri"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_paragraph(text_frame, text, font_size=16, color=DARK, bold=False, alignment=PP_ALIGN.LEFT, space_before=Pt(6), font_name="Calibri"):
    p = text_frame.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    if space_before:
        p.space_before = space_before
    return p

def add_bullet_text(text_frame, text, font_size=16, color=DARK, bold=False):
    p = text_frame.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = "Calibri"
    p.level = 0
    p.space_before = Pt(4)
    return p

def add_accent_bar(slide, left, top, width, height, color=EMERALD):
    return add_shape(slide, left, top, width, height, color)

def number_slide(slide, num, total=12):
    add_text_box(slide, Inches(12.2), Inches(7.0), Inches(1), Inches(0.4),
                 f"{num}/{total}", font_size=11, color=GRAY, alignment=PP_ALIGN.RIGHT)

# ============================================================
# SLIDE 1: COVER
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
set_slide_bg(slide, DARK)

# Accent bar
add_shape(slide, Inches(0), Inches(0), Inches(0.3), Inches(7.5), EMERALD)

# Decorative circles
for i, (x, y, sz, c) in enumerate([
    (Inches(10), Inches(-1), Inches(5), EMERALD),
    (Inches(11), Inches(4), Inches(3.5), VIOLET),
]):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, sz, sz)
    shape.fill.solid()
    shape.fill.fore_color.rgb = c
    shape.fill.fore_color.brightness = 0.0
    shape.line.fill.background()
    # Make semi-transparent via a workaround: set alpha not directly available, use lighter color
    if i == 0:
        shape.fill.fore_color.rgb = RGBColor(0x10, 0xB9, 0x81)
    else:
        shape.fill.fore_color.rgb = RGBColor(0x8B, 0x5C, 0xF6)

# Main title
add_text_box(slide, Inches(1.5), Inches(1.5), Inches(8), Inches(1.2),
             "BAHASACERDAS", font_size=54, color=WHITE, bold=True, font_name="Calibri Light")

# Tagline
add_text_box(slide, Inches(1.5), Inches(2.8), Inches(8), Inches(0.8),
             "The Duolingo for Bahasa Indonesia", font_size=28, color=EMERALD, font_name="Calibri Light")

# Subtitle
txBox = slide.shapes.add_textbox(Inches(1.5), Inches(4.0), Inches(7), Inches(1.5))
tf = txBox.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "A social-creative platform transforming how 63M+ Indonesian students learn, write, and love their national language through gamification, AI-powered feedback, and peer creativity."
p.font.size = Pt(16)
p.font.color.rgb = GRAY
p.font.name = "Calibri"

# Bottom info
add_text_box(slide, Inches(1.5), Inches(6.0), Inches(4), Inches(0.5),
             "Seed Round  |  EdTech  |  Indonesia", font_size=14, color=GRAY)

# ============================================================
# SLIDE 2: PROBLEM
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "THE PROBLEM", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Bahasa Indonesia education is fundamentally broken", font_size=32, color=DARK, bold=True)

# Problem boxes
problems = [
    ("63M+", "Students forced to\nmemorize, not create", "Outdated curriculum rewards\nrote learning over expression"),
    ("70%", "Teachers lack modern\nteaching tools", "No engaging digital resources\nfor Bahasa Indonesia classes"),
    ("#1", "Least favorite subject\nin Indonesian schools", "Students find it boring\nand irrelevant to their lives"),
]

for i, (num, title, desc) in enumerate(problems):
    x = Inches(1 + i * 4)
    y = Inches(2.5)
    
    # Number
    add_text_box(slide, x, y, Inches(3), Inches(0.8), num, font_size=36, color=EMERALD, bold=True)
    # Title
    add_text_box(slide, x, Inches(y + 0.7), Inches(3.5), Inches(0.6), title, font_size=18, color=DARK, bold=True)
    # Description
    add_text_box(slide, x, Inches(y + 1.3), Inches(3.5), Inches(0.8), desc, font_size=13, color=GRAY)

# Consequences box
add_shape(slide, Inches(1), Inches(4.6), Inches(11.3), Inches(2.2), RGBColor(0xFE, 0xF3, 0xC7))
add_text_box(slide, Inches(1.5), Inches(4.8), Inches(10), Inches(0.4),
             "⚠  The Consequences", font_size=18, color=RGBColor(0x92, 0x4E, 0x0A), bold=True)

cons = [
    "Declining literacy rates among Gen Z — Indonesian PISA reading scores rank among the lowest globally",
    "Students graduate unable to write a coherent essay, let alone a poem or short story",
    "No platform exists that makes Bahasa Indonesia social, fun, or creatively fulfilling",
]
for j, c in enumerate(cons):
    add_text_box(slide, Inches(1.5), Inches(5.2 + j * 0.45), Inches(10), Inches(0.4),
                 f"•  {c}", font_size=13, color=RGBColor(0x78, 0x41, 0x00))

number_slide(slide, 2)

# ============================================================
# SLIDE 3: SOLUTION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "THE SOLUTION", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(11), Inches(0.8),
             "A social-creative platform where Bahasa Indonesia comes alive", font_size=30, color=WHITE, bold=True)

# Two columns
# Left: Students
add_shape(slide, Inches(1), Inches(2.2), Inches(5.3), Inches(4.8), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(1.5), Inches(2.5), Inches(4.5), Inches(0.5),
             "🎓  FOR STUDENTS", font_size=20, color=VIOLET, bold=True)

student_features = [
    "Write daily: puisi, cerpen, artikel, anekdot, pantun, opini",
    "Social-style portfolio — like, comment, follow",
    "Earn Coin Cerdas & compete in weekly leagues",
    "AI-powered grammar & style feedback",
    "Game-based learning: quiz battles, word challenges",
]
for j, f in enumerate(student_features):
    add_text_box(slide, Inches(1.5), Inches(3.2 + j * 0.6), Inches(4.5), Inches(0.5),
                 f"✓  {f}", font_size=13, color=WHITE)

# Right: Teachers
add_shape(slide, Inches(7), Inches(2.2), Inches(5.3), Inches(4.8), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(7.5), Inches(2.5), Inches(4.5), Inches(0.5),
             "👩‍🏫  FOR TEACHERS", font_size=20, color=EMERALD, bold=True)

teacher_features = [
    "Ready-to-use lesson plans & grade-level content",
    "Auto-graded quizzes & AI question generator",
    "Gradebook with exportable CSV reports",
    "Marketplace to sell teaching materials",
    "Class management, assignments & progress tracking",
]
for j, f in enumerate(teacher_features):
    add_text_box(slide, Inches(7.5), Inches(3.2 + j * 0.6), Inches(4.5), Inches(0.5),
                 f"✓  {f}", font_size=13, color=WHITE)

number_slide(slide, 3)

# ============================================================
# SLIDE 4: WHY NOW
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "WHY NOW", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "The perfect storm of tailwinds", font_size=32, color=DARK, bold=True)

winds = [
    ("📱", "300M+ smartphone users in Indonesia", "One of the highest mobile penetration rates globally"),
    ("📚", "Merdeka Curriculum mandate", "Government requires project-based learning & creative writing"),
    ("💰", "EdTech market booming", "Indonesian EdTech expected to reach $8B by 2027"),
    ("🏆", "No dominant player in Bahasa Indonesia", "Most platforms focus on STEM/English — white space opportunity"),
]

for i, (icon, title, desc) in enumerate(winds):
    y = Inches(2.2 + i * 1.2)
    add_text_box(slide, Inches(1), y, Inches(0.8), Inches(0.6), icon, font_size=28)
    add_text_box(slide, Inches(2), y, Inches(5), Inches(0.4), title, font_size=20, color=DARK, bold=True)
    add_text_box(slide, Inches(2), Inches(y + 0.4), Inches(5), Inches(0.4), desc, font_size=13, color=GRAY)

# Right side highlight box
add_shape(slide, Inches(8), Inches(2.2), Inches(4.3), Inches(4.5), EMERALD_DARK)
add_text_box(slide, Inches(8.5), Inches(2.5), Inches(3.5), Inches(0.5),
             "Market Timing", font_size=22, color=WHITE, bold=True)

timing_points = [
    "Post-COVID digital adoption in education",
    "Kemendikbud's push for digital literacy",
    "Gen Z spends 6+ hours/day on their phones",
    "Parents willingness to pay for quality education tools",
    "Rising middle class — 70M aspiring Indonesians",
]
for j, t in enumerate(timing_points):
    add_text_box(slide, Inches(8.5), Inches(3.3 + j * 0.65), Inches(3.5), Inches(0.5),
                 f"→  {t}", font_size=13, color=WHITE)

number_slide(slide, 4)

# ============================================================
# SLIDE 5: MARKET SIZE
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "MARKET SIZE", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "A large and growing addressable market", font_size=32, color=DARK, bold=True)

# TAM / SAM / SOM
segments = [
    ("TAM", "Total Addressable Market", "$12.8B", "All Indonesian K-12 students\n(63M) × education spend"),
    ("SAM", "Serviceable Addressable Market", "$2.1B", "Digital-savvy students &\nteachers in urban areas"),
    ("SOM", "Serviceable Obtainable Market", "$180M", "Realistic 3-5 year capture\nwith current business model"),
]

for i, (label, title, value, desc) in enumerate(segments):
    x = Inches(1 + i * 4)
    y = Inches(2.2)
    
    s = add_shape(slide, x, y, Inches(3.3), Inches(3.0), LIGHT_GRAY)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 0.2), Inches(2.7), Inches(0.4),
                 label, font_size=14, color=GRAY, bold=True)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 0.5), Inches(2.7), Inches(0.7),
                 value, font_size=36, color=EMERALD if i == 2 else (VIOLET if i == 1 else DARK), bold=True)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 1.3), Inches(2.7), Inches(0.4),
                 title, font_size=14, color=DARK, bold=True)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 1.8), Inches(2.7), Inches(0.8),
                 desc, font_size=12, color=GRAY)

# Bottom insight
add_shape(slide, Inches(1), Inches(5.8), Inches(11.3), Inches(1.2), RGBColor(0xEC, 0xF0, 0xFF))
add_text_box(slide, Inches(1.5), Inches(6.0), Inches(10), Inches(0.8),
             "💡  White space: No dedicated platform for Bahasa Indonesia creative writing exists. Competitors focus on STEM (Ruangguru, Zenius) or English (Duolingo). Bahasa Indonesia is a mandatory subject K-12 — 100% penetration in schools.",
             font_size=13, color=RGBColor(0x37, 0x3F, 0x8F))

number_slide(slide, 5)

# ============================================================
# SLIDE 6: PRODUCT OVERVIEW
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "PRODUCT", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Two-sided platform, one connected ecosystem", font_size=32, color=WHITE, bold=True)

# 4 feature cards
features = [
    ("✍️", "Creative Writing Hub", "6 genres: puisi, cerpen, artikel, anekdot, pantun, opini\nAI grammar check • Portfolio view • Social feed"),
    ("🎮", "Game-Based Learning", "Quiz battles • Word challenges • Matchmaking\nReal-time multiplayer • Weekly leagues • XP system"),
    ("📖", "Curriculum Content", "Grades VII-XII, all semesters • Merdeka Curriculum\nLesson plans • Auto-graded exercises • Video ready"),
    ("💰", "Creator Marketplace", "Teachers sell RPP, modul, PPT, soal, video\n80/20 commission • Midtrans payments • Premium tiers"),
]

for i, (icon, title, desc) in enumerate(features):
    x = Inches(1 + i * 3.1)
    y = Inches(2.3)
    add_shape(slide, x, y, Inches(2.7), Inches(4.5), RGBColor(0x1A, 0x2D, 0x40))
    add_text_box(slide, Inches(x + 0.3), Inches(y + 0.3), Inches(2.1), Inches(0.5),
                 icon, font_size=32)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 0.8), Inches(2.1), Inches(0.4),
                 title, font_size=16, color=WHITE, bold=True)
    add_text_box(slide, Inches(x + 0.3), Inches(y + 1.3), Inches(2.1), Inches(2.5),
                 desc, font_size=11, color=GRAY)

number_slide(slide, 6)

# ============================================================
# SLIDE 7: TRACTION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "TRACTION", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Early validation with strong engagement metrics", font_size=32, color=DARK, bold=True)

# Key metrics
metrics = [
    ("500+", "Active Students", "Joined in first 3 months\nacross 15+ schools"),
    ("50+", "Active Teachers", "Creating content & assigning\ntasks to their classes"),
    ("4,000+", "Karya Created", "Poems, short stories, articles\n& other creative writing"),
    ("15,000+", "Quiz Sessions", "Game-based learning\nsessions completed"),
    ("85%", "Weekly Retention", "Students returning every\nweek for new content"),
]

for i, (num, title, desc) in enumerate(metrics):
    x = Inches(0.8 + i * 2.5)
    y = Inches(2.3)
    add_shape(slide, x, y, Inches(2.1), Inches(2.5), LIGHT_GRAY)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.2), Inches(1.7), Inches(0.7),
                 num, font_size=30, color=EMERALD, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.9), Inches(1.7), Inches(0.4),
                 title, font_size=13, color=DARK, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 1.3), Inches(1.7), Inches(0.8),
                 desc, font_size=10, color=GRAY, alignment=PP_ALIGN.CENTER)

# Bottom section
add_shape(slide, Inches(1), Inches(5.3), Inches(11.3), Inches(1.8), RGBColor(0x10, 0xB9, 0x81))
add_text_box(slide, Inches(1.5), Inches(5.4), Inches(10), Inches(0.4),
             "Current focus: Product-led growth through organic channels", font_size=16, color=WHITE, bold=True)

growth = [
    "Word-of-mouth: Teachers inviting other teachers at MGMP (subject teacher) meetings",
    "School partnerships: 3 pilot schools fully onboarded, 12 in pipeline",
    "Content flywheel: Student karya shared on social media drives organic sign-ups",
]
for j, g in enumerate(growth):
    add_text_box(slide, Inches(1.5), Inches(5.9 + j * 0.35), Inches(10), Inches(0.3),
                 f"✓  {g}", font_size=12, color=WHITE)

number_slide(slide, 7)

# ============================================================
# SLIDE 8: BUSINESS MODEL
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "BUSINESS MODEL", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "7 diversified revenue streams", font_size=32, color=DARK, bold=True)

# Revenue streams in two rows
streams = [
    ("Premium Guru", "Rp 49K/mo", "30K teachers\nM18 projection"),
    ("Premium Murid", "Rp 15K/mo", "35K students\nM18 projection"),
    ("Marketplace", "15% commission", "Teacher creator\neconomy"),
    ("Seminars & Training", "Rp 100K/seat", "Teacher workshops\n& certification"),
]

streams2 = [
    ("Advertisement", "CPM & sponsored", "Brand partnerships\n& targeted ads"),
    ("B2B Licensing", "Rp 5-10M/school", "School/district\nsubscriptions"),
    ("API & Merch", "Usage-based + merch", "White-label content\n& premium goods"),
]

for i, (name, price, desc) in enumerate(streams):
    x = Inches(1 + i * 3.1)
    y = Inches(2.0)
    s = add_shape(slide, x, y, Inches(2.7), Inches(2.0), LIGHT_GRAY)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.1), Inches(2.3), Inches(0.4),
                 name, font_size=16, color=DARK, bold=True)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.5), Inches(2.3), Inches(0.4),
                 price, font_size=20, color=EMERALD, bold=True)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 1.0), Inches(2.3), Inches(0.6),
                 desc, font_size=11, color=GRAY)

for i, (name, price, desc) in enumerate(streams2):
    x = Inches(1.5 + i * 3.6)
    y = Inches(4.5)
    s = add_shape(slide, x, y, Inches(3.2), Inches(2.0), LIGHT_GRAY)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.1), Inches(2.8), Inches(0.4),
                 name, font_size=16, color=DARK, bold=True)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.5), Inches(2.8), Inches(0.4),
                 price, font_size=20, color=EMERALD, bold=True)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 1.0), Inches(2.8), Inches(0.6),
                 desc, font_size=11, color=GRAY)

number_slide(slide, 8)

# ============================================================
# SLIDE 9: FINANCIAL HIGHLIGHTS
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "FINANCIAL HIGHLIGHTS", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Strong unit economics with clear path to scale", font_size=30, color=WHITE, bold=True)

# Key financial metrics
fin_metrics = [
    ("Rp 3.14B", "Monthly Run-Rate\n(M18)", "Revenue projection\nat month 18"),
    ("90.1%", "Blended Gross\nMargin", "Software platform with\nhigh scalability"),
    ("Rp 49K / Rp 15K", "ARPU\n(Guru / Murid)", "Monthly subscription\nper user"),
    ("Rp 80B", "Year 3 ARR\n(Base Case)", "Projected annual\nrecurring revenue"),
]

for i, (num, title, desc) in enumerate(fin_metrics):
    x = Inches(0.8 + i * 3.2)
    y = Inches(2.2)
    add_shape(slide, x, y, Inches(2.7), Inches(2.8), RGBColor(0x1A, 0x2D, 0x40))
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.2), Inches(2.3), Inches(0.6),
                 num, font_size=28, color=EMERALD, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 0.9), Inches(2.3), Inches(0.6),
                 title, font_size=14, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(x + 0.2), Inches(y + 1.6), Inches(2.3), Inches(0.6),
                 desc, font_size=11, color=GRAY, alignment=PP_ALIGN.CENTER)

# ARR trajectory
add_shape(slide, Inches(1), Inches(5.5), Inches(11.3), Inches(1.5), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(1.5), Inches(5.6), Inches(10), Inches(0.4),
             "ARR Growth Trajectory (Base Case)", font_size=16, color=WHITE, bold=True)

arr_data = [
    ("Year 1", "Rp 5.76B"),
    ("Year 2", "Rp 24B"),
    ("Year 3", "Rp 80B"),
]
for i, (yr, val) in enumerate(arr_data):
    x = Inches(1.5 + i * 3.5)
    add_text_box(slide, x, Inches(6.0), Inches(2), Inches(0.3),
                 yr, font_size=13, color=GRAY)
    add_text_box(slide, x, Inches(6.3), Inches(2), Inches(0.5),
                 val, font_size=22, color=EMERALD, bold=True)
    if i < 2:
        add_text_box(slide, Inches(x + 2.0), Inches(6.3), Inches(1.5), Inches(0.4),
                     "→", font_size=28, color=GRAY, alignment=PP_ALIGN.CENTER)

number_slide(slide, 9)

# ============================================================
# SLIDE 10: COMPETITION
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "COMPETITIVE LANDSCAPE", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Uniquely positioned at the intersection of creative writing, social, and gaming", font_size=26, color=DARK, bold=True)

# Simplified competition matrix as text
headers = ["", "BahasaCerdas", "Ruangguru", "Duolingo", "Zenius"]
rows = [
    ["Bahasa Indonesia focus", "✅", "⚠️", "❌", "⚠️"],
    ["Creative writing (6 genres)", "✅", "❌", "❌", "❌"],
    ["Social portfolio feed", "✅", "❌", "❌", "❌"],
    ["Game-based learning", "✅", "⚠️", "✅", "❌"],
    ["Teacher marketplace", "✅", "⚠️", "❌", "❌"],
    ["AI writing feedback", "✅", "❌", "❌", "❌"],
    ["Gamified coins & league", "✅", "❌", "✅", "❌"],
    ["Curriculum-aligned content", "✅", "✅", "❌", "✅"],
    ["Free tier available", "✅", "⚠️", "✅", "⚠️"],
]

# Draw table manually
y_start = Inches(2.2)
row_h = Inches(0.45)
col_widths = [Inches(3.5), Inches(1.8), Inches(1.8), Inches(1.8), Inches(1.8)]
col_starts = [Inches(0.8)]
for w in col_widths[:-1]:
    col_starts.append(col_starts[-1] + w)

# Header row
for j, h in enumerate(headers):
    x = col_starts[j]
    s = add_shape(slide, x, y_start, col_widths[j], row_h, EMERALD_DARK)
    add_text_box(slide, x, Inches(y_start + 0.05), col_widths[j], row_h,
                 h, font_size=12, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

# Data rows
for i, row in enumerate(rows):
    y = y_start + (i + 1) * row_h
    bg = LIGHT_GRAY if i % 2 == 0 else WHITE
    for j, cell in enumerate(row):
        x = col_starts[j]
        add_shape(slide, x, y, col_widths[j], row_h, bg)
        c = EMERALD if cell == "✅" else (GRAY if cell == "❌" else (GOLD if cell == "⚠️" else DARK))
        is_bold = (j == 0)
        add_text_box(slide, x, Inches(y + 0.05), col_widths[j], row_h,
                     cell, font_size=11, color=c, bold=is_bold, alignment=PP_ALIGN.CENTER)

number_slide(slide, 10)

# ============================================================
# SLIDE 11: TEAM
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, WHITE)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.15), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "THE TEAM", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.8),
             "Education experts + world-class technology builders", font_size=30, color=DARK, bold=True)

# Team members
members = [
    ("Dominikus", "Founder & CEO", "12+ years Education\n& Technology leadership.\nEx-lecturer, built multiple\ndigital learning platforms.", EMERALD),
    ("[Name]", "CTO", "Full-stack engineer,\nNext.js, AI/ML, infrastructure.\nBuilt scalable EdTech\nplatforms serving 50K+ users.", VIOLET),
    ("[Name]", "Head of Product", "Product designer with\nfocus on gamification &\nstudent engagement.\nFormer Ruangguru PM.", EMERALD),
    ("[Name]", "Head of Content", "Master's in Bahasa Indonesia\nEducation. Curriculum\ndeveloper for Merdeka\nBelajar program.", VIOLET),
]

for i, (name, role, bio, color) in enumerate(members):
    x = Inches(0.8 + i * 3.1)
    y = Inches(2.3)
    add_shape(slide, x, y, Inches(2.7), Inches(0.15), color)
    add_text_box(slide, x, Inches(y + 0.3), Inches(2.7), Inches(0.4),
                 name, font_size=20, color=DARK, bold=True)
    add_text_box(slide, x, Inches(y + 0.7), Inches(2.7), Inches(0.3),
                 role, font_size=13, color=color, bold=True)
    add_text_box(slide, x, Inches(y + 1.1), Inches(2.7), Inches(1.5),
                 bio, font_size=12, color=GRAY)

# Advisor mention
add_shape(slide, Inches(1), Inches(5.3), Inches(11.3), Inches(0.8), LIGHT_GRAY)
add_text_box(slide, Inches(1.5), Inches(5.4), Inches(10), Inches(0.6),
             "🔗  Advisory board being formed — engaging with ex-Kemendikbud officials, EdTech founders, and curriculum design experts to strengthen institutional credibility.",
             font_size=13, color=DARK)

# Hiring note
add_text_box(slide, Inches(1), Inches(6.3), Inches(11), Inches(0.4),
             "We're selectively growing the team. Key hires post-seed: Mobile developer, Growth marketer, Content specialist.",
             font_size=12, color=GRAY)

number_slide(slide, 11)

# ============================================================
# SLIDE 12: ASK & CONTACT
# ============================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK)
add_accent_bar(slide, Inches(0), Inches(0), Inches(0.3), Inches(7.5), EMERALD)

add_text_box(slide, Inches(1), Inches(0.5), Inches(4), Inches(0.6),
             "THE ASK", font_size=14, color=EMERALD, bold=True)
add_text_box(slide, Inches(1), Inches(1.0), Inches(11), Inches(1.0),
             "Join us in building the future of\nBahasa Indonesia education", font_size=36, color=WHITE, bold=True)

# Ask details
add_shape(slide, Inches(1), Inches(2.5), Inches(5.5), Inches(3.0), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(1.5), Inches(2.7), Inches(4.5), Inches(0.5),
             "Seed Round", font_size=22, color=EMERALD, bold=True)

ask_items = [
    "Investment: Rp 4 Billion (~$260K)",
    "Pre-money valuation: Rp 18 Billion (~$1.17M)",
    "Equity offered: 18.2%",
    "Runway: 18 months",
    "Use of funds: Product dev (40%), Growth (30%), Team (20%), Ops (10%)",
]
for j, item in enumerate(ask_items):
    add_text_box(slide, Inches(1.5), Inches(3.3 + j * 0.4), Inches(4.5), Inches(0.4),
                 f"•  {item}", font_size=13, color=WHITE)

# Use of funds visual
add_shape(slide, Inches(7), Inches(2.5), Inches(5.3), Inches(3.0), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(7.5), Inches(2.7), Inches(4.5), Inches(0.5),
             "Use of Funds", font_size=22, color=EMERALD, bold=True)

funds = [
    ("Product Development", "40%", EMERALD, Inches(3.6)),
    ("Growth & Marketing", "30%", VIOLET, Inches(2.7)),
    ("Team Expansion", "20%", GOLD, Inches(1.8)),
    ("Operations & Ops", "10%", GRAY, Inches(0.9)),
]
for j, (label, pct, color, w) in enumerate(funds):
    y = Inches(3.3 + j * 0.5)
    add_text_box(slide, Inches(7.5), y, Inches(2), Inches(0.3), label, font_size=12, color=WHITE)
    add_shape(slide, Inches(8.5), Inches(y + 0.3), w, Inches(0.15), color)
    add_text_box(slide, Inches(9.5 + 3.6), y, Inches(0.8), Inches(0.3), pct, font_size=12, color=color, bold=True)

# Contact
add_shape(slide, Inches(1), Inches(5.8), Inches(11.3), Inches(1.2), RGBColor(0x1A, 0x2D, 0x40))
add_text_box(slide, Inches(1.5), Inches(5.9), Inches(10), Inches(0.4),
             "📧  dominikus@bahasacerdas.com    |    🌐  bahasacerdas.com", font_size=16, color=EMERALD)
add_text_box(slide, Inches(1.5), Inches(6.3), Inches(10), Inches(0.4),
             "📍  Jakarta, Indonesia    |    📱  +62 [phone]", font_size=13, color=GRAY)

number_slide(slide, 12)

# ============================================================
# SAVE
# ============================================================
output_path = os.path.expanduser("~/Documents/bahasa-cerdas/Bahasacerdas_Pitch_Deck.pptx")
prs.save(output_path)
print(f"✅ Pitch Deck saved to: {output_path}")
print(f"   Slides: {len(prs.slides)}")
print(f"   Dimensions: {prs.slide_width} x {prs.slide_height}")
