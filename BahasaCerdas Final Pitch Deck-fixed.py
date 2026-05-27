import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# 1. SETUP PRESENTATION
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# COLOR PALETTE (Premium Dark Theme)
BG_DARK   = RGBColor(0x0B, 0x0E, 0x17)
BG_CARD   = RGBColor(0x14, 0x1A, 0x2A)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GRAY      = RGBColor(0x9C, 0xA3, 0xAF)
GRAY_DIM  = RGBColor(0x4B, 0x55, 0x63)
TEAL      = RGBColor(0x2D, 0xD4, 0xBF)
VIOLET    = RGBColor(0x8B, 0x5C, 0xF6)
GOLD      = RGBColor(0xF5, 0x9E, 0x0B)
RED       = RGBColor(0xF4, 0x3F, 0x5E)

def new_slide():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG_DARK
    return slide

def box(slide, l, t, w, h, fill):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    s.line.color.rgb = fill
    return s

def txt(slide, l, t, w, h, text, size=14, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    tx = slide.shapes.add_textbox(l, t, w, h)
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    p.text = text
    p.font.name = 'Arial'
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    return tx

def header(slide, title, page_num):
    box(slide, Inches(0.5), Inches(0.5), Inches(0.06), Inches(0.6), TEAL)
    txt(slide, Inches(0.7), Inches(0.45), Inches(10), Inches(0.6), title, size=32, color=WHITE, bold=True)
    txt(slide, Inches(12.0), Inches(0.5), Inches(0.8), Inches(0.4), f"{page_num}/12", size=12, color=GRAY_DIM, align=PP_ALIGN.RIGHT)

# ==========================================
# SLIDE 1: TITLE SLIDE
# ==========================================
s1 = new_slide()
txt(s1, Inches(1), Inches(2.2), Inches(11.333), Inches(0.4), "BAHASACERDAS", size=16, color=TEAL, bold=True, align=PP_ALIGN.CENTER)
txt(s1, Inches(1), Inches(2.8), Inches(11.333), Inches(1.8), "Social-Creative\nPlatform for Education", size=54, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
txt(s1, Inches(1), Inches(4.8), Inches(11.333), Inches(0.4), "Seed Round  \u2022  EdTech  \u2022  Indonesia", size=18, color=GRAY, align=PP_ALIGN.CENTER)
txt(s1, Inches(1), Inches(5.4), Inches(11.333), Inches(0.8), "Transforming how 63M+ students learn, write, and love their national language through gamification and social creativity.", size=14, color=GRAY, align=PP_ALIGN.CENTER)
txt(s1, Inches(0.5), Inches(6.8), Inches(5), Inches(0.4), "dominikus@bahasacerdas.com | bahasacerdas.com", size=11, color=GRAY_DIM)
txt(s1, Inches(11.0), Inches(6.8), Inches(1.8), Inches(0.4), "01/12", size=11, color=GRAY_DIM, align=PP_ALIGN.RIGHT)

# ==========================================
# SLIDE 2: THE PROBLEM
# ==========================================
s2 = new_slide()
header(s2, "Education is Broken", "02")
box(s2, Inches(0.5), Inches(1.6), Inches(6.0), Inches(4.8), BG_CARD)
txt(s2, Inches(0.8), Inches(1.8), Inches(5.4), Inches(0.5), "The Core Problem", size=20, color=TEAL, bold=True)
p_text = (
    "\u2022 63M+ Students: Forced to memorize rather than create. Rote learning kills expression.\n\n"
    "\u2022 70% Teachers: Lack modern digital tools. No engaging resources for Bahasa classes.\n\n"
    "\u2022 #1 Least Favorite: Students find it boring and irrelevant in a digital world."
)
txt(s2, Inches(0.8), Inches(2.5), Inches(5.4), Inches(3.5), p_text, size=15, color=GRAY)

box(s2, Inches(6.8), Inches(1.6), Inches(6.0), Inches(4.8), BG_CARD)
txt(s2, Inches(7.1), Inches(1.8), Inches(5.4), Inches(0.5), "Consequences", size=20, color=RED, bold=True)
c_text = (
    "\u2022 Indonesia's PISA reading scores rank among the lowest globally.\n\n"
    "\u2022 Students graduate unable to write a coherent essay, professional letter, or poem.\n\n"
    "\u2022 No modern platform makes learning Bahasa Indonesia social, interactive, or fun."
)
txt(s2, Inches(7.1), Inches(2.5), Inches(5.4), Inches(3.5), c_text, size=15, color=GRAY)

# ==========================================
# SLIDE 3: THE SOLUTION
# ==========================================
s3 = new_slide()
header(s3, "Creativity Meets Gamification", "03")
box(s3, Inches(0.5), Inches(1.8), Inches(6.0), Inches(4.6), BG_CARD)
txt(s3, Inches(0.8), Inches(2.0), Inches(5.4), Inches(0.5), "For Students", size=22, color=TEAL, bold=True)
s_text = (
    "\u2022 Write daily with instant AI grammar & style feedback\n"
    "\u2022 Showcase work in a Behance-style social portfolio feed\n"
    "\u2022 Earn Coin Cerdas for learning & engagement milestones\n"
    "\u2022 Compete in exciting weekly leagues & interactive quiz battles"
)
txt(s3, Inches(0.8), Inches(2.7), Inches(5.4), Inches(3.2), s_text, size=15, color=GRAY)

box(s3, Inches(6.8), Inches(1.8), Inches(6.0), Inches(4.6), BG_CARD)
txt(s3, Inches(7.1), Inches(2.0), Inches(5.4), Inches(0.5), "For Teachers", size=22, color=VIOLET, bold=True)
t_text = (
    "\u2022 Access localized, grade-level content mapped for VII\u2013XII\n"
    "\u2022 AI question generator & automated gradebook integration\n"
    "\u2022 Premium marketplace for sharing RPP, Modul, & Video\n"
    "\u2022 Real-time progress tracking & institutional analytics dashboards"
)
txt(s3, Inches(7.1), Inches(2.7), Inches(5.4), Inches(3.2), t_text, size=15, color=GRAY)

# ==========================================
# SLIDE 4: MARKET TAILWINDS
# ==========================================
s4 = new_slide()
header(s4, "Perfect Timing: Four Tailwinds", "04")
tw = [
    ("Mobile Dominance", "300M+ Smartphone users. Gen Z spends 6+ hours/day on mobile devices.", Inches(0.5), Inches(1.8)),
    ("Merdeka Mandate", "New national curriculum strictly requires project-based learning and creative writing.", Inches(6.8), Inches(1.8)),
    ("EdTech Boom", "Indonesian EdTech sector is projected to hit a massive $8B valuation by 2027.", Inches(0.5), Inches(4.4)),
    ("White Space", "Main competitors focus exclusively on STEM/English. Bahasa is a completely wide open field.", Inches(6.8), Inches(4.4))
]
for title, desc, l, t in tw:
    box(s4, l, t, Inches(6.0), Inches(2.2), BG_CARD)
    txt(s4, l+Inches(0.3), t+Inches(0.2), Inches(5.4), Inches(0.4), title, size=18, color=TEAL, bold=True)
    txt(s4, l+Inches(0.3), t+Inches(0.7), Inches(5.4), Inches(1.3), desc, size=14, color=GRAY)

# ==========================================
# SLIDE 5: MARKET SIZE (TAM SAM SOM)
# ==========================================
s5 = new_slide()
header(s5, "Large Addressable Market", "05")
mkt = [
    ("TAM", "$12.8B", "63M K-12 Students in Indonesia", TEAL, Inches(0.5)),
    ("SAM", "$2.1B", "Urban & Digital-Savvy Student Segment", VIOLET, Inches(4.766)),
    ("SOM", "$180M", "Target 3-5 Year Market Capture Value", GOLD, Inches(9.033))
]
for label, val, note, col, l in mkt:
    box(s5, l, Inches(2.2), Inches(3.8), Inches(3.6), BG_CARD)
    txt(s5, l, Inches(2.5), Inches(3.8), Inches(0.4), label, size=20, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(s5, l, Inches(3.0), Inches(3.8), Inches(1.0), val, size=48, color=col, bold=True, align=PP_ALIGN.CENTER)
    txt(s5, l, Inches(4.3), Inches(3.8), Inches(1.0), note, size=14, color=GRAY, align=PP_ALIGN.CENTER)

txt(s5, Inches(0.5), Inches(6.2), Inches(12.333), Inches(0.5), '\u201cBahasa Indonesia is a mandatory subject K-12 with 100% school penetration nationwide.\u201d', size=16, color=TEAL, bold=False, align=PP_ALIGN.CENTER)

# ==========================================
# SLIDE 6: PRODUCT ARCHITECTURE
# ==========================================
s6 = new_slide()
header(s6, "One Platform, Two-Sided Ecosystem", "06")
box(s6, Inches(0.5), Inches(1.8), Inches(4.5), Inches(4.5), BG_CARD)
txt(s6, Inches(0.5), Inches(3.6), Inches(4.5), Inches(0.5), "[ Visual Dashboard Dashboard Interface ]", size=14, color=GRAY_DIM, align=PP_ALIGN.CENTER)

feats = [
    ("Creative Writing Suite", "Supports 6 main literary genres, instant AI modular feedback engine, and customized public portfolio feeds."),
    ("Game-Based Learning Engine", "Live gamified quiz battles, automated point allocation, and real-time community-driven weekly leagues."),
    ("Curriculum Alignment VII-XII", "Thousands of localized modular practice test sets, text comprehension exercises, and structured quizzes."),
    ("Teacher Marketplace Hub", "Direct digital storefront engine allowing peer resource sharing with built-in 80/20 platform split commission.")
]
for i, (title, desc) in enumerate(feats):
    y = Inches(1.8 + i*1.15)
    box(s6, Inches(5.5), y, Inches(7.333), Inches(1.05), BG_CARD)
    box(s6, Inches(5.5), y, Inches(0.06), Inches(1.05), TEAL)
    txt(s6, Inches(5.7), y+Inches(0.1), Inches(7.0), Inches(0.3), title, size=16, color=WHITE, bold=True)
    txt(s6, Inches(5.7), y+Inches(0.4), Inches(7.0), Inches(0.6), desc, size=12, color=GRAY)

# Tech Stack footer callout
box(s6, Inches(0.5), Inches(6.5), Inches(12.333), Inches(0.5), BG_CARD)
txt(s6, Inches(0.6), Inches(6.6), Inches(12.1), Inches(0.3), "Technical Infrastructure Status: 52+ Production Database Models | 21,600+ High-Quality Content Items | 57,000+ Lines of Production Code", size=11, color=TEAL, bold=True)

# ==========================================
# SLIDE 7: EARLY TRACTION
# ==========================================
s7 = new_slide()
header(s7, "Early Validation & Traction", "07")
trac = [
    ("500+ Active Students", "Onboarded organically across 15+ early adopter pilot schools within just 3 months."),
    ("50+ Active Teachers", "Daily active utilization for formal content creation, custom quizzes, and assignment distribution."),
    ("4,000+ Karya Created", "High-volume repository expansion including user-generated poems, stories, and structured articles."),
    ("85% High Weekly Retention", "Extremely sticky engagement metrics driven by viral loops and organic community features.")
]
for i, (title, desc) in enumerate(trac):
    y = Inches(1.8 + i*1.2)
    box(s7, Inches(0.5), y, Inches(6.0), Inches(1.05), BG_CARD)
    txt(s7, Inches(0.8), y+Inches(0.1), Inches(5.4), Inches(0.3), title, size=16, color=TEAL, bold=True)
    txt(s7, Inches(0.8), y+Inches(0.4), Inches(5.4), Inches(0.6), desc, size=13, color=GRAY)

box(s7, Inches(7.0), Inches(1.8), Inches(5.8), Inches(4.65), BG_CARD)
box(s7, Inches(7.0), Inches(1.8), Inches(5.8), Inches(0.06), VIOLET)
txt(s7, Inches(7.4), Inches(2.2), Inches(5.0), Inches(0.4), "THE GROWTH FLYWHEEL", size=20, color=WHITE, bold=True)
flywheel = (
    "\u2022 MGMP Networks Activation:\n"
    "Hyper-targeted word-of-mouth growth across localized regional teacher communities.\n\n"
    "\u2022 Robust Enterprise Pipeline:\n"
    "12 new regional school partnerships currently pending active rollout.\n\n"
    "\u2022 Student Co-Sharing Network:\n"
    "Organic portfolio content sharing directly to mainstream social media platforms drives massive zero-cost acquisition."
)
txt(s7, Inches(7.4), Inches(2.8), Inches(5.0), Inches(3.3), flywheel, size=13, color=GRAY)

# ==========================================
# SLIDE 8: REVENUE BUSINESS MODEL
# ==========================================
s8 = new_slide()
header(s8, "Diversified Revenue Streams", "08")
rev_streams = [
    ("Premium Subscription - Guru", "Rp 49K / mo", 1.0, "Rp 1.47 Miliar / bulan"),
    ("Premium Subscription - Murid", "Rp 15K / mo", 0.35, "Rp 525 Juta / bulan"),
    ("Targeted B2B Ad Placement", "Enterprise Advertisers", 0.17, "Rp 250 Juta / bulan"),
    ("B2B Institutional School Licensing", "Annual Contracts", 0.14, "Rp 200 Juta / bulan"),
    ("Toko Karya Marketplace (15% Split)", "Ecosystem Transaction Moat", 0.10, "High Margin Volume")
]
for j, (name, pricing, pct, m_val) in enumerate(rev_streams):
    y = Inches(1.8 + j * 0.9)
    txt(s8, Inches(0.5), y, Inches(3.2), Inches(0.4), name, size=13, color=WHITE, bold=True)
    txt(s8, Inches(0.5), y+Inches(0.3), Inches(3.2), Inches(0.3), pricing, size=11, color=GRAY)
    
    # Draw progress bar background
    box(s8, Inches(3.8), y+Inches(0.1), Inches(5.0), Inches(0.35), BG_CARD)
    # Draw filled bar
    if pct > 0:
        box(s8, Inches(3.8), y+Inches(0.1), Inches(5.0 * pct), Inches(0.35), TEAL)
        
    txt(s8, Inches(9.0), y, Inches(3.8), Inches(0.4), m_val, size=13, color=TEAL, bold=True)

box(s8, Inches(0.5), Inches(6.3), Inches(12.333), Inches(0.6), BG_CARD)
txt(s8, Inches(0.5), Inches(6.45), Inches(12.333), Inches(0.4), "M18 ARR PROJECTION RUN-RATE TARGET: Rp 3.14 MILIAR / BULAN", size=16, color=GOLD, bold=True, align=PP_ALIGN.CENTER)

# ==========================================
# SLIDE 9: FINANCIAL PROJECTIONS
# ==========================================
s9 = new_slide()
header(s9, "Financial Growth Highlights", "09")
box(s9, Inches(0.5), Inches(1.8), Inches(6.0), Inches(1.5), BG_CARD)
txt(s9, Inches(0.5), Inches(2.1), Inches(6.0), Inches(0.5), "90.1%", size=36, color=TEAL, bold=True, align=PP_ALIGN.CENTER)
txt(s9, Inches(0.5), Inches(2.7), Inches(6.0), Inches(0.3), "Blended Software Gross Margin", size=13, color=GRAY, align=PP_ALIGN.CENTER)

box(s9, Inches(6.8), Inches(1.8), Inches(6.0), Inches(1.5), BG_CARD)
txt(s9, Inches(6.8), Inches(2.1), Inches(6.0), Inches(0.5), "18 Months", size=36, color=VIOLET, bold=True, align=PP_ALIGN.CENTER)
txt(s9, Inches(6.8), Inches(2.7), Inches(6.0), Inches(0.3), "Operational Capital Runway Security", size=13, color=GRAY, align=PP_ALIGN.CENTER)

# Trend Line Chart representation box
box(s9, Inches(0.5), Inches(3.7), Inches(12.333), Inches(2.4), BG_CARD)
txt(s9, Inches(1.0), Inches(3.9), Inches(11.333), Inches(0.4), "FORWARD REVENUE TRAJECTORY (3-YEAR FORECAST)", size=14, color=WHITE, bold=True)

# Add 3 horizontal timeline milestones
years = [
    ("YEAR 1", "Rp 5.7B Annual", Inches(1.5)),
    ("YEAR 2", "Rp 24.0B Annual", Inches(5.5)),
    ("YEAR 3", "Rp 80.0B Annual Target", Inches(9.5))
]
for title, rev, x in years:
    box(s9, x, Inches(4.5), Inches(2.5), Inches(1.2), BG_DARK)
    box(s9, x, Inches(4.5), Inches(2.5), Inches(0.04), TEAL)
    txt(s9, x, Inches(4.7), Inches(2.5), Inches(0.3), title, size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(s9, x, Inches(5.1), Inches(2.5), Inches(0.4), rev, size=15, color=GOLD, bold=True, align=PP_ALIGN.CENTER)

# ==========================================
# SLIDE 10: COMPETITIVE LANDSCAPE
# ==========================================
s10 = new_slide()
header(s10, "Competitive Landscape Matrix", "10")

# Table Setup
cols = 5
rows = 5
left = Inches(0.5)
top = Inches(2.0)
width = Inches(12.333)
height = Inches(4.5)

table_shape = s10.shapes.add_table(rows, cols, left, top, width, height)
table = table_shape.table

# Set Column Widths
table.columns[0].width = Inches(3.5)
for m in range(1, 5):
    table.columns[m].width = Inches(2.208)

headers = ["Core Feature Metric", "BahasaCerdas", "Ruangguru", "Duolingo", "Zenius"]
matrix = [
    ["Bahasa Indonesia Focus", "YES (100% Core)", "Partial (Generic)", "No (Global Only)", "Partial (Generic)"],
    ["Creative Writing Suite", "YES (6 Genres)", "No", "No", "No"],
    ["Social Portfolio Feed", "YES (Built-In)", "No", "No", "No"],
    ["Teacher Marketplace Engine", "YES (80/20 Split)", "No", "No", "No"]
]

for c in range(5):
    cell = table.cell(0, c)
    cell.fill.solid()
    cell.fill.fore_color.rgb = BG_CARD if c != 1 else TEAL
    p = cell.text_frame.paragraphs[0]
    p.text = headers[c]
    p.font.bold = True
    p.font.size = Pt(14)
    p.font.color.rgb = WHITE if c != 1 else BG_DARK
    p.alignment = PP_ALIGN.CENTER

for r in range(4):
    for c in range(5):
        cell = table.cell(r+1, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = BG_CARD
        p = cell.text_frame.paragraphs[0]
        p.text = matrix[r][c]
        p.font.size = Pt(13)
        if c == 0:
            p.font.color.rgb = WHITE
            p.alignment = PP_ALIGN.LEFT
        else:
            p.font.color.rgb = TEAL if "YES" in matrix[r][c] else GRAY
            p.alignment = PP_ALIGN.CENTER

# ==========================================
# SLIDE 11: THE TEAM
# ==========================================
s11 = new_slide()
header(s11, "Built for Industrial Scale", "11")

box(s11, Inches(0.5), Inches(2.0), Inches(4.0), Inches(4.0), BG_CARD)
txt(s11, Inches(0.5), Inches(3.8), Inches(4.0), Inches(0.5), "[ Team Photo Frame ]", size=14, color=GRAY_DIM, align=PP_ALIGN.CENTER)

txt(s11, Inches(5.0), Inches(2.0), Inches(7.833), Inches(0.5), "Dominikus (Founder & CEO)", size=24, color=WHITE, bold=True)
bio = (
    "\u2022 12+ Years in formal EduTech sector architecture, system design, and scaling.\n\n"
    "\u2022 Successfully engineered multiple high-load educational content distribution systems.\n\n"
    "\u2022 Full-Stack core competence across modern frameworks (Next.js, Postgres, Supabase)."
)
txt(s11, Inches(5.0), Inches(2.7), Inches(7.833), Inches(2.0), bio, size=15, color=GRAY)

box(s11, Inches(5.0), Inches(5.0), Inches(3.7), Inches(1.2), BG_CARD)
txt(s11, Inches(5.2), Inches(5.2), Inches(3.3), Inches(0.8), "[ Hiring Post-Seed ]\nChief Technology Officer", size=13, color=VIOLET, bold=True)

box(s11, Inches(9.1), Inches(5.0), Inches(3.7), Inches(1.2), BG_CARD)
txt(s11, Inches(9.3), Inches(5.2), Inches(3.3), Inches(0.8), "[ Hiring Post-Seed ]\nHead of Product Experience", size=13, color=VIOLET, bold=True)

# ==========================================
# SLIDE 12: INVESTMENT ASK
# ==========================================
s12 = new_slide()
txt(s12, Inches(1), Inches(1.5), Inches(11.333), Inches(0.8), "Join Us in Building the Future of Language EdTech", size=36, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

box(s12, Inches(2.0), Inches(2.8), Inches(4.2), Inches(2.2), BG_CARD)
box(s12, Inches(2.0), Inches(2.8), Inches(4.2), Inches(0.06), TEAL)
txt(s12, Inches(2.0), Inches(3.2), Inches(4.2), Inches(0.4), "INVESTMENT ASK", size=14, color=GRAY, align=PP_ALIGN.CENTER)
txt(s12, Inches(2.0), Inches(3.7), Inches(4.2), Inches(0.8), "Rp 4 MILIAR", size=32, color=TEAL, bold=True, align=PP_ALIGN.CENTER)
txt(s12, Inches(2.0), Inches(4.5), Inches(4.2), Inches(0.3), "Seed Round Inbound", size=12, color=GRAY_DIM, align=PP_ALIGN.CENTER)

box(s12, Inches(7.133), Inches(2.8), Inches(4.2), Inches(2.2), BG_CARD)
box(s12, Inches(7.133), Inches(2.8), Inches(4.2), Inches(0.06), VIOLET)
txt(s12, Inches(7.133), Inches(3.2), Inches(4.2), Inches(0.4), "EQUITY COMPOSITION", size=14, color=GRAY, align=PP_ALIGN.CENTER)
txt(s12, Inches(7.133), Inches(3.7), Inches(4.2), Inches(0.8), "18.2%", size=32, color=VIOLET, bold=True, align=PP_ALIGN.CENTER)
txt(s12, Inches(7.133), Inches(4.5), Inches(4.2), Inches(0.3), "Post-Money Valuation Base", size=12, color=GRAY_DIM, align=PP_ALIGN.CENTER)

txt(s12, Inches(1), Inches(5.6), Inches(11.333), Inches(0.4), "Primary Operations: Jakarta, Indonesia", size=14, color=GRAY, align=PP_ALIGN.CENTER)
txt(s12, Inches(1), Inches(6.1), Inches(11.333), Inches(0.4), "Contact: dominikus@bahasacerdas.com  |  Ecosystem: bahasacerdas.com", size=15, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

# SAVE FILE
import os
desktop = os.path.expanduser("~/Desktop")
prs.save(os.path.join(desktop, "BahasaCerdas_Final_Pitch_Deck.pptx"))
print(f"SUCCESS: File BahasaCerdas_Final_Pitch_Deck.pptx saved to {desktop}")
