from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

BG_DARK   = RGBColor(0x0B, 0x0E, 0x17)
BG_CARD   = RGBColor(0x14, 0x1A, 0x2A)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GRAY      = RGBColor(0x9C, 0xA3, 0xAF)
GRAY_DIM  = RGBColor(0x4B, 0x55, 0x63)
TEAL      = RGBColor(0x2D, 0xD4, 0xBF)
VIOLET    = RGBColor(0x8B, 0x5C, 0xF6)
GOLD      = RGBColor(0xF5, 0x9E, 0x0B)

def new_slide():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG_DARK
    return slide

def box(slide, l, t, w, h, fill):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    s.fill.solid(); s.fill.fore_color.rgb = fill; s.line.fill.background()
    return s

def txt(slide, l, t, w, h, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    b = slide.shapes.add_textbox(l, t, w, h)
    b.text_frame.word_wrap = True
    p = b.text_frame.paragraphs[0]; p.text = text
    p.font.size = Pt(size); p.font.color.rgb = color; p.font.bold = bold; p.font.name = "Calibri"; p.alignment = align
    return b

def lbl(slide, text, top=Inches(0.5)):
    txt(slide, Inches(1), top, Inches(4), Inches(0.5), text, size=13, color=TEAL, bold=True)

def title(slide, text, top=Inches(1.1)):
    txt(slide, Inches(1), top, Inches(11), Inches(0.9), text, size=42, color=WHITE, bold=True)

def acc(slide):
    box(slide, Inches(0), 0, Inches(0.2), Inches(7.5), TEAL)
    box(slide, Inches(0.2), 0, Inches(0.06), Inches(7.5), VIOLET)

def slide_num(s, n):
    txt(s, Inches(11.5), Inches(6.9), Inches(1.3), Inches(0.4), f"{n:02d}/12", size=11, color=GRAY_DIM, align=PP_ALIGN.RIGHT)

# ═══ 1 — COVER ═══
s = new_slide()
box(s, Inches(0), 0, Inches(13.333), Inches(7.5), RGBColor(0x06, 0x09, 0x12))
sh = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9), Inches(-2), Inches(7), Inches(7))
sh.fill.solid(); sh.fill.fore_color.rgb = TEAL; sh.line.fill.background()
sh2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-1.5), Inches(4.5), Inches(5), Inches(5))
sh2.fill.solid(); sh2.fill.fore_color.rgb = VIOLET; sh2.line.fill.background()
txt(s, Inches(1.5), Inches(1.8), Inches(8), Inches(1.2), "BAHASACERDAS", size=64, color=WHITE, bold=True)
txt(s, Inches(1.5), Inches(2.8), Inches(7), Inches(0.6), "The Social-Creative Platform for\nBahasa Indonesia Education", size=26, color=TEAL)
txt(s, Inches(1.5), Inches(4.2), Inches(7), Inches(1.5), "Seed Round  \u2022  EdTech  \u2022  Indonesia\nTransforming how 63M+ students learn, write, and love their national language\nthrough gamification, AI-powered feedback, and social creativity.", size=14, color=GRAY)
txt(s, Inches(1.5), Inches(6.2), Inches(4), Inches(0.4), "dominikus@bahasacerdas.com  |  bahasacerdas.com", size=12, color=GRAY_DIM)

# ═══ 2 — PROBLEM ═══
s = new_slide(); acc(s)
lbl(s, "THE PROBLEM"); title(s, "Bahasa Indonesia education is broken")
stats = [("63M+", "students forced to\nmemorize, not create", "Rote learning kills\ncreative expression", TEAL),
         ("70%", "teachers lack modern\ndigital tools", "No engaging resources\nfor Bahasa classes", VIOLET),
         ("#1", "least favorite subject\nin Indonesian schools", "Students find it boring\nand irrelevant", GOLD)]
for i,(n,t,d,c) in enumerate(stats):
    x = Inches(1.2+i*3.8); box(s,x,Inches(2.3),Inches(3.3),Inches(2.8),BG_CARD)
    box(s,x,Inches(2.3),Inches(3.3),Inches(0.06),c)
    txt(s,Inches(x+0.3),Inches(2.6),Inches(2.7),Inches(0.7),n,size=42,color=c,bold=True)
    txt(s,Inches(x+0.3),Inches(3.3),Inches(2.7),Inches(0.6),t,size=15,color=WHITE,bold=True)
    txt(s,Inches(x+0.3),Inches(3.9),Inches(2.7),Inches(0.6),d,size=12,color=GRAY)
box(s,Inches(1.2),Inches(5.5),Inches(11.2),Inches(1.6),BG_CARD)
txt(s,Inches(1.5),Inches(5.6),Inches(10.5),Inches(0.3),"\u26a0  CONSEQUENCES",size=13,color=GOLD,bold=True)
for j,c in enumerate(["Indonesia's PISA reading scores rank among the lowest globally",
                       "Students graduate unable to write a coherent essay or poem",
                       "No platform makes Bahasa Indonesia social, fun, or creative"]):
    txt(s,Inches(1.5),Inches(6.0+j*0.35),Inches(10),Inches(0.3),f"  {c}",size=12,color=GRAY)
slide_num(s,2)

# ═══ 3 — SOLUTION ═══
s = new_slide(); acc(s)
lbl(s, "THE SOLUTION"); title(s, "Where creativity meets gamification")
box(s,Inches(1),Inches(2.3),Inches(5.5),Inches(4.8),BG_CARD)
box(s,Inches(1),Inches(2.3),Inches(5.5),Inches(0.06),VIOLET)
txt(s,Inches(1.3),Inches(2.5),Inches(5),Inches(0.5),"\U0001f393  FOR STUDENTS",size=20,color=VIOLET,bold=True)
for j,t in enumerate(["Write daily across 6 genres with AI grammar feedback",
                       "Social portfolio: Behance-style for writing",
                       "Earn Coin Cerdas through writing & engagement",
                       "Weekly leagues: compete & get promoted",
                       "Game battles: real-time quiz challenges"]):
    txt(s,Inches(1.3),Inches(3.2+j*0.55),Inches(4.8),Inches(0.4),f"\u2713  {t}",size=13,color=WHITE)
box(s,Inches(6.8),Inches(2.3),Inches(5.5),Inches(4.8),BG_CARD)
box(s,Inches(6.8),Inches(2.3),Inches(5.5),Inches(0.06),TEAL)
txt(s,Inches(7.1),Inches(2.5),Inches(5),Inches(0.5),"\U0001f469\u200d\U0001f3eb  FOR TEACHERS",size=20,color=TEAL,bold=True)
for j,t in enumerate(["Grade-level content: VII\u2013XII, all semesters",
                       "AI question generator by KD & difficulty",
                       "Auto-gradebook with A-E scoring & CSV export",
                       "Marketplace: sell RPP, Modul, PPT, Video",
                       "Class management & progress tracking"]):
    txt(s,Inches(7.1),Inches(3.2+j*0.55),Inches(4.8),Inches(0.4),f"\u2713  {t}",size=13,color=WHITE)
slide_num(s,3)

# ═══ 4 — WHY NOW ═══
s = new_slide(); acc(s)
lbl(s, "WHY NOW"); title(s, "Perfect timing: four converging tailwinds")
for i,(ic,ti,d) in enumerate([("\U0001f4f1","300M+ Smartphone Users","Highest mobile penetration globally.\nGen Z spends 6+ hrs/day on phones."),
                               ("\U0001f4da","Merdeka Curriculum Mandate","Government requires project-based\nlearning & creative writing."),
                               ("\U0001f4b0","EdTech Market Boom","Indonesian EdTech projected to\nreach $8B by 2027."),
                               ("\U0001f3c6","No Dominant Player","Competitors focus on STEM/English.\nBahasa is white space.")]):
    x = Inches(1.2+i*3); box(s,x,Inches(2.3),Inches(2.6),Inches(4.5),BG_CARD)
    txt(s,Inches(x+0.3),Inches(2.6),Inches(2),Inches(0.5),ic,size=30)
    txt(s,Inches(x+0.3),Inches(3.2),Inches(2),Inches(0.5),ti,size=15,color=WHITE,bold=True)
    txt(s,Inches(x+0.3),Inches(3.9),Inches(2),Inches(2.5),d,size=11,color=GRAY)
slide_num(s,4)

# ═══ 5 — MARKET ═══
s = new_slide(); acc(s)
lbl(s, "MARKET SIZE"); title(s, "Large and growing addressable market")
seg = [("TAM","$12.8B","Total Addressable Market","All 63M K-12 students",TEAL),
       ("SAM","$2.1B","Serviceable Addressable Market","Urban digital-savvy users",VIOLET),
       ("SOM","$180M","Serviceable Obtainable Market","3-5 year realistic capture",GOLD)]
for i,(l,v,t,d,c) in enumerate(seg):
    x=Inches(1+i*4); box(s,x,Inches(2.3),Inches(3.3),Inches(3.5),BG_CARD)
    txt(s,Inches(x+0.3),Inches(2.5),Inches(2.7),Inches(0.3),l,size=12,color=c,bold=True)
    txt(s,Inches(x+0.3),Inches(2.8),Inches(2.7),Inches(0.7),v,size=44,color=c,bold=True)
    box(s,Inches(x+0.3),Inches(3.5),Inches(2.5),Inches(0.04),c)
    txt(s,Inches(x+0.3),Inches(3.7),Inches(2.7),Inches(0.4),t,size=14,color=WHITE,bold=True)
    txt(s,Inches(x+0.3),Inches(4.2),Inches(2.7),Inches(0.6),d,size=11,color=GRAY)
box(s,Inches(1),Inches(6.2),Inches(11.2),Inches(0.9),BG_CARD)
txt(s,Inches(1.3),Inches(6.3),Inches(10.5),Inches(0.6),"\U0001f4a1  Bahasa Indonesia is mandatory K-12 with 100% school penetration \u2014 yet no dedicated platform exists for creative writing.",size=12,color=TEAL)
slide_num(s,5)

# ═══ 6 — PRODUCT ═══
s = new_slide(); acc(s)
lbl(s, "PRODUCT"); title(s, "One platform, two-sided ecosystem")
for i,(ic,t,d) in enumerate([("\u270d\ufe0f","Creative Writing","6 genres, AI feedback,\nportfolio & social feed"),
                              ("\U0001f3ae","Game-Based Learning","Quiz battles, matchmaking,\nweekly leagues & XP"),
                              ("\U0001f4d6","Curriculum Content","VII\u2013XII, all semesters,\nexercises & quizzes"),
                              ("\U0001f4b0","Creator Marketplace","80/20 commission,\nMidtrans payments")]):
    x=Inches(1+i*3.1); box(s,x,Inches(2.3),Inches(2.7),Inches(3.0),BG_CARD)
    box(s,x,Inches(2.3),Inches(2.7),Inches(0.06),TEAL if i%2==0 else VIOLET)
    txt(s,Inches(x+0.3),Inches(2.6),Inches(2.1),Inches(0.5),ic,size=32)
    txt(s,Inches(x+0.3),Inches(3.2),Inches(2.1),Inches(0.4),t,size=18,color=WHITE,bold=True)
    txt(s,Inches(x+0.3),Inches(3.7),Inches(2.1),Inches(1.0),d,size=11,color=GRAY)
for i,(n,l) in enumerate([("52+","Database Models"),("21,600+","Content Items"),("4","Game Modes"),("12","Grade Levels"),("57K+","Lines of Code")]):
    x=Inches(1+i*2.4); box(s,x,Inches(5.8),Inches(2),Inches(1.3),BG_CARD)
    txt(s,x,Inches(5.9),Inches(2),Inches(0.5),n,size=22,color=TEAL,bold=True,align=PP_ALIGN.CENTER)
    txt(s,x,Inches(6.4),Inches(2),Inches(0.5),l,size=10,color=GRAY,align=PP_ALIGN.CENTER)
slide_num(s,6)

# ═══ 7 — TRACTION ═══
s = new_slide(); acc(s)
lbl(s, "TRACTION"); title(s, "Early validation with strong retention")
for i,(n,t,d,c) in enumerate([("500+","Active Students","15+ schools, 3 months",TEAL),
                               ("50+","Active Teachers","Creating & assigning daily",VIOLET),
                               ("4,000+","Karya Created","Poems, stories, articles",TEAL),
                               ("15,000+","Quiz Sessions","Game sessions completed",VIOLET),
                               ("85%","Weekly Retention","Students returning weekly",GOLD)]):
    x=Inches(0.8+i*2.5); box(s,x,Inches(2.3),Inches(2.2),Inches(2.8),BG_CARD)
    box(s,x,Inches(2.3),Inches(2.2),Inches(0.06),c)
    txt(s,x,Inches(2.6),Inches(2.2),Inches(0.6),n,size=36,color=c,bold=True,align=PP_ALIGN.CENTER)
    txt(s,x,Inches(3.2),Inches(2.2),Inches(0.3),t,size=14,color=WHITE,bold=True,align=PP_ALIGN.CENTER)
    txt(s,x,Inches(3.7),Inches(2.2),Inches(0.6),d,size=11,color=GRAY,align=PP_ALIGN.CENTER)
box(s,Inches(1),Inches(5.5),Inches(11.2),Inches(1.6),BG_CARD)
txt(s,Inches(1.3),Inches(5.6),Inches(10.5),Inches(0.3),"\U0001f4c8  GROWTH ENGINE",size=13,color=TEAL,bold=True)
for j,c in enumerate(["Word-of-mouth: teachers inviting teachers at MGMP meetings",
                       "School partnerships: 3 pilot schools, 12 in pipeline",
                       "Content flywheel: student karya shared on social media drives sign-ups"]):
    txt(s,Inches(1.5),Inches(6.0+j*0.35),Inches(10),Inches(0.3),f"  {c}",size=12,color=GRAY)
slide_num(s,7)

# ═══ 8 — BUSINESS MODEL ═══
s = new_slide(); acc(s)
lbl(s, "BUSINESS MODEL"); title(s, "7 diversified revenue streams")
for i,(nm,pr,ds,c) in enumerate([("Premium Guru","Rp 49K/mo","\u00d7 30K = Rp 1.47B/mo",TEAL),
                                   ("Premium Murid","Rp 15K/mo","\u00d7 35K = Rp 525M/mo",VIOLET),
                                   ("Marketplace","15%","Teacher creator economy",GOLD),
                                   ("Seminar","Rp 100K/seat","Workshops & cert",TEAL)]):
    x=Inches(1+i*3.1); box(s,x,Inches(2.3),Inches(2.7),Inches(2.2),BG_CARD)
    box(s,x,Inches(2.3),Inches(2.7),Inches(0.06),c)
    txt(s,Inches(x+0.2),Inches(2.5),Inches(2.3),Inches(0.3),nm,size=14,color=c,bold=True)
    txt(s,Inches(x+0.2),Inches(2.9),Inches(2.3),Inches(0.4),pr,size=20,color=WHITE,bold=True)
    txt(s,Inches(x+0.2),Inches(3.4),Inches(2.3),Inches(0.6),ds,size=10,color=GRAY)
for i,(nm,pr,ds,c) in enumerate([("Advertisement","Rp 250M/mo","CPM + sponsored",VIOLET),
                                   ("B2B Licensing","Rp 200M/mo","School subscriptions",TEAL),
                                   ("API & Merch","Rp 100M/mo","White-label + merch",GOLD)]):
    x=Inches(1.8+i*3.6); box(s,x,Inches(4.8),Inches(3.2),Inches(1.6),BG_CARD)
    box(s,x,Inches(4.8),Inches(3.2),Inches(0.06),c)
    txt(s,Inches(x+0.2),Inches(5.0),Inches(2.8),Inches(0.3),nm,size=14,color=c,bold=True)
    txt(s,Inches(x+0.2),Inches(5.4),Inches(2.8),Inches(0.4),pr,size=18,color=WHITE,bold=True)
    txt(s,Inches(x+0.2),Inches(5.8),Inches(2.8),Inches(0.3),ds,size=10,color=GRAY)
box(s,Inches(1),Inches(6.7),Inches(11.2),Inches(0.5),TEAL)
txt(s,Inches(1),Inches(6.7),Inches(11.2),Inches(0.5),"M18 TOTAL MONTHLY RUN-RATE: Rp 3.14 MILIAR / BULAN",size=14,color=BG_DARK,bold=True,align=PP_ALIGN.CENTER)
slide_num(s,8)

# ═══ 9 — FINANCIALS ═══
s = new_slide(); acc(s)
lbl(s, "FINANCIAL HIGHLIGHTS"); title(s, "Strong unit economics, clear path to scale")
for i,(n,t,d,c) in enumerate([("90.1%","Gross Margin","Highly scalable SaaS",TEAL),
                               ("Rp 49K","ARPU Guru","Per month subscription",VIOLET),
                               ("Rp 15K","ARPU Murid","Per month subscription",TEAL),
                               ("18 Months","Runway","Product 40%, Growth 30%\nTeam 20%, Ops 10%",GOLD)]):
    x=Inches(1+i*3.1); box(s,x,Inches(2.3),Inches(2.7),Inches(3.0),BG_CARD)
    box(s,x,Inches(2.3),Inches(2.7),Inches(0.06),c)
    txt(s,Inches(x+0.2),Inches(2.5),Inches(2.3),Inches(0.6),n,size=34,color=c,bold=True,align=PP_ALIGN.CENTER)
    txt(s,Inches(x+0.2),Inches(3.2),Inches(2.3),Inches(0.6),t,size=13,color=WHITE,bold=True,align=PP_ALIGN.CENTER)
    txt(s,Inches(x+0.2),Inches(3.9),Inches(2.3),Inches(0.8),d,size=10,color=GRAY,align=PP_ALIGN.CENTER)
box(s,Inches(1),Inches(5.7),Inches(11.2),Inches(1.5),BG_CARD)
txt(s,Inches(1.3),Inches(5.8),Inches(5),Inches(0.3),"ARR GROWTH TRAJECTORY (BASE CASE)",size=13,color=TEAL,bold=True)
for i,(y,v) in enumerate([("Year 1","Rp 5.76B"),("Year 2","Rp 24B"),("Year 3","Rp 80B")]):
    x=Inches(1.5+i*3.5)
    txt(s,x,Inches(6.2),Inches(2),Inches(0.3),y,size=12,color=GRAY)
    txt(s,x,Inches(6.5),Inches(2),Inches(0.5),v,size=26,color=TEAL,bold=True)
    if i<2: txt(s,Inches(x+1.8),Inches(6.5),Inches(1.5),Inches(0.4),"\u25b8",size=28,color=GRAY_DIM)
slide_num(s,9)

# ═══ 10 — COMPETITION ═══
s = new_slide(); acc(s)
lbl(s, "COMPETITIVE LANDSCAPE"); title(s, "Uniquely positioned at the intersection")
hdrs = ["","BAHASACERDAS","Ruangguru","Duolingo","Zenius"]
rows = [("Bahasa Indonesia focus","\u2705","\u26a0","\u274c","\u26a0"),
        ("Creative writing (6 genres)","\u2705","\u274c","\u274c","\u274c"),
        ("Social portfolio feed","\u2705","\u274c","\u274c","\u274c"),
        ("Game-based learning","\u2705","\u26a0","\u2705","\u274c"),
        ("Teacher marketplace","\u2705","\u26a0","\u274c","\u274c"),
        ("AI writing feedback","\u2705","\u274c","\u274c","\u274c"),
        ("Coin economy & leagues","\u2705","\u274c","\u2705","\u274c"),
        ("Curriculum-aligned content","\u2705","\u2705","\u274c","\u2705")]
cw=[Inches(3.3),Inches(2.0),Inches(2.0),Inches(2.0),Inches(2.0)]
cx=[Inches(0.8)]; [cx.append(cx[-1]+w) for w in cw[:-1]]
rh=Inches(0.42); y0=Inches(2.2)
for j,h in enumerate(hdrs):
    box(s,cx[j],y0,cw[j],rh,TEAL)
    txt(s,cx[j],y0+Inches(0.05),cw[j],rh,h,size=12,color=WHITE if j>0 else TEAL,bold=True,align=PP_ALIGN.CENTER)
for i,(l,*vs) in enumerate(rows):
    y=y0+(i+1)*rh; bg=BG_CARD if i%2==0 else RGBColor(0x10,0x15,0x25)
    box(s,cx[0],y,cw[0],rh,bg)
    txt(s,cx[0],y+Inches(0.05),cw[0],rh,l,size=11,color=WHITE)
    for j,v in enumerate(vs):
        box(s,cx[j+1],y,cw[j+1],rh,bg)
        cl=TEAL if v=="\u2705" else (GRAY_DIM if v=="\u274c" else GOLD)
        txt(s,cx[j+1],y+Inches(0.05),cw[j+1],rh,v,size=14,color=cl,bold=True,align=PP_ALIGN.CENTER)
slide_num(s,10)

# ═══ 11 — TEAM ═══
s = new_slide(); acc(s)
lbl(s, "THE TEAM"); title(s, "Education experts building for scale")
for i,(nm,rl,bio,c) in enumerate([("Dominikus","Founder & CEO","12+ years in Education Technology\nand platform building.\nEx-lecturer, built multiple\ndigital learning products.",TEAL),
                                    ("[Hiring]","CTO","Full-stack engineer, Next.js,\nAI/ML infrastructure.\nScalable systems for 50K+ users.",VIOLET),
                                    ("[Hiring]","Head of Product","Product designer focused on\ngamification and student\nengagement. EdTech preferred.",TEAL),
                                    ("[Hiring]","Head of Content","Master's in Bahasa Indonesia\nEducation. Curriculum design\nfor Merdeka Belajar.",VIOLET)]):
    x=Inches(0.8+i*3.1); box(s,x,Inches(2.3),Inches(2.7),Inches(3.5),BG_CARD)
    box(s,x,Inches(2.3),Inches(2.7),Inches(0.06),c)
    txt(s,Inches(x+0.2),Inches(2.6),Inches(2.3),Inches(0.4),nm,size=20,color=WHITE,bold=True)
    txt(s,Inches(x+0.2),Inches(3.0),Inches(2.3),Inches(0.5),rl,size=12,color=c,bold=True)
    txt(s,Inches(x+0.2),Inches(3.5),Inches(2.3),Inches(2.0),bio,size=11,color=GRAY)
box(s,Inches(1),Inches(6.2),Inches(11.2),Inches(0.9),BG_CARD)
txt(s,Inches(1.3),Inches(6.3),Inches(10.5),Inches(0.7),"\U0001f517  Key hires post-seed: Mobile Developer, Growth Marketer, Content Specialist. Advisory board being formed.",size=12,color=GRAY)
slide_num(s,11)

# ═══ 12 — ASK ═══
s = new_slide(); acc(s)
lbl(s, "THE ASK")
title(s, "Join us in building the future of\nBahasa Indonesia education", top=Inches(1.0))
box(s,Inches(1),Inches(2.5),Inches(7),Inches(3.5),BG_CARD)
box(s,Inches(1),Inches(2.5),Inches(0.06),Inches(3.5),TEAL)
txt(s,Inches(1.5),Inches(2.6),Inches(6),Inches(0.4),"INVESTMENT ROUND",size=18,color=TEAL,bold=True)
for j,(l,v) in enumerate([("Investment:","Rp 4 Miliar (~$260K)"),
                           ("Pre-money:","Rp 18 Miliar (~$1.17M)"),
                           ("Equity:","18.2%"),
                           ("Runway:","18 months"),
                           ("Lead Investor:","Open \u2014 first close available")]):
    txt(s,Inches(1.5),Inches(3.1+j*0.5),Inches(2.5),Inches(0.4),l,size=14,color=GRAY)
    txt(s,Inches(4.2),Inches(3.1+j*0.5),Inches(3.5),Inches(0.4),v,size=14,color=WHITE,bold=True)
box(s,Inches(8.5),Inches(2.5),Inches(3.8),Inches(3.5),BG_CARD)
box(s,Inches(8.5),Inches(2.5),Inches(0.06),Inches(3.5),GOLD)
txt(s,Inches(9.0),Inches(2.6),Inches(3),Inches(0.4),"USE OF FUNDS",size=18,color=GOLD,bold=True)
for j,(l,p,c,w) in enumerate([("Product Development","40%",TEAL,Inches(2.6)),
                               ("Growth & Marketing","30%",VIOLET,Inches(2.0)),
                               ("Infrastructure & AI","15%",GOLD,Inches(1.0)),
                               ("Ops & Legal","15%",GRAY,Inches(1.0))]):
    y=Inches(3.1+j*0.65)
    txt(s,Inches(9.0),y,Inches(2.5),Inches(0.3),l,size=11,color=WHITE)
    box(s,Inches(9.0),y+Inches(0.3),w,Inches(0.1),c)
    txt(s,Inches(9.0+2.6),y,Inches(1),Inches(0.3),p,size=11,color=c,bold=True)
box(s,Inches(1),Inches(6.3),Inches(11.2),Inches(0.8),TEAL)
txt(s,Inches(1.3),Inches(6.35),Inches(5),Inches(0.4),"\U0001f4e7  dominikus@bahasacerdas.com",size=16,color=BG_DARK,bold=True)
txt(s,Inches(6),Inches(6.35),Inches(5),Inches(0.4),"\U0001f310  bahasacerdas.com",size=16,color=BG_DARK,bold=True)
txt(s,Inches(1.3),Inches(6.65),Inches(10),Inches(0.3),"\U0001f4cd Jakarta, Indonesia",size=12,color=RGBColor(0x0A,0x5A,0x50))
slide_num(s,12)

# ═══ SAVE ═══
import os
path = os.path.expanduser("~/Documents/bahasa-cerdas/Bahasacerdas_Pitch_Deck.pptx")
prs.save(path)
print(f"Done: {path}")
