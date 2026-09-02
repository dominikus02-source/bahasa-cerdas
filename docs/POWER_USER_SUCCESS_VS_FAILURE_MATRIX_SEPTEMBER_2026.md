# Power User Success vs Failure Matrix — September 2026

**Source:** Phase 3 Power User & Power School Forensic Audit  
**Data:** 478 teachers, 1,951 students, 130 schools  
**Cut-off:** September 1, 2026

---

## §1 Teacher Success vs Failure

| Dimension | Power Teachers (Top 20) | Failed Teachers (Bottom 50) | Delta |
|-----------|------------------------:|----------------------------:|------:|
| **Created class** | 18/20 (90%) | 0/50 (0%) | +90pp |
| **Invited students** | 12/20 (60%) | 0/50 (0%) | +60pp |
| **Students learning** | 8/20 (40%) | 0/50 (0%) | +40pp |
| **Used AI tools** | 14/20 (70%) | 0/50 (0%) | +70pp |
| **Used assessment** | 8/20 (40%) | 0/50 (0%) | +40pp |
| **Returned within 7d** | 15/20 (75%) | 0/50 (0%) | +75pp |
| **Returned within 30d** | 18/20 (90%) | 3/50 (6%) | +84pp |
| **Median students** | 36 | 0 | +36 |
| **Median learning events** | 4 | 0 | +4 |
| **Median composite score** | 179 | 12 | +167 |

### What Separates Them

| Factor | Power Teachers Do | Failed Teachers Don't |
|--------|-------------------|----------------------|
| **Step 1: Create class** | 90% create within 3.5 days | 0% ever create a class |
| **Step 2: Invite students** | 60% get students within 0 days of class | 0% invite students |
| **Step 3: Students learn** | 40% see student learning within 1 day | 0% have learning events |
| **Step 4: Return** | 75% return within 7 days | 0% return within 7 days |
| **AI usage** | 70% use AI (median 6 calls) | 0% use AI |
| **Karya** | 10% create karya | 0% create karya |

### The Cliff

```
Power Teachers:  SCORE 12–1,036 (median 179)
Failed Teachers: SCORE 12 (all flatlined)

The entire bottom 50 teachers score exactly 12–13.
They signed up, maybe looked around, and left.
Zero classes. Zero students. Zero learning.
```

---

## §2 Student Success vs Failure

| Dimension | Power Students (Top 50) | Bottom Students (n=1,901) | Delta |
|-----------|------------------------:|--------------------------:|------:|
| **Has group (school-linked)** | 48/50 (96%) | 1,189/1,901 (63%) | +33pp |
| **Active days ≥2** | 50/50 (100%) | ~50/1,901 (3%) | +97pp |
| **Learning events** | 20–61 | 0–2 | +20–61 |
| **Jalur Cerdas units** | 20–61 | 0–2 | +20–61 |
| **Median XP** | 2,610 | ~0 | +2,610 |
| **Karya created** | Most have 0–5 | 0 | — |
| **UKBI attempted** | 58% | 41% | +17pp |

### What Separates Them

| Factor | Power Students Do | Other Students Don't |
|--------|-------------------|---------------------|
| **School-linked** | 96% belong to a class/group | 63% are self-registered |
| **Jalur Cerdas** | Complete 20–61 units | Complete 0–2 units |
| **Active days** | ≥2 active days | Mostly 0 active days |
| **Teacher-guided** | Have teacher creating structure | Self-directed (often drop off) |
| **Peer effect** | Top students cluster in same schools | Scattered across platform |

---

## §3 School Success vs Failure

| Dimension | Power Schools (Top 10) | Single-User Schools (n=107) | Delta |
|-----------|-----------------------:|----------------------------:|------:|
| **Users** | 12–201 | 1 | +11–200 |
| **Teachers** | 0–3 | 1 | Variable |
| **Active students** | 4–117 | 0 | +4–117 |
| **Learning events** | 0–556 | 0 | +0–556 |
| **D30 retention** | 24.1% (school-linked) | 4.3% (self-registered) | **5.6×** |
| **Has classes** | 0–17 | 0 | +0–17 |

### School Archetypes

| Archetype | Examples | Pattern | Score Range |
|-----------|----------|---------|------------:|
| **Champion-led** | smpnegeri6binjai, smpnegeri1jenamas | 1–3 teachers actively using, students follow | 359–482 |
| **School-wide adoption** | santalaurensia, smpsantalaurensiaalamsutera | Many students, few/no teacher accounts (self-organized) | 1,408–2,625 |
| **Full ecosystem** | smpsantalaurensia, sekolahharapanbangsa | Multiple teachers + classes + students + karya | 1,067–3,530 |
| **Phantom** | 107 single-user schools | Only 1 user (often the teacher), no students | 0 |

---

## §4 Feature Adoption Matrix

| Feature | Power Teachers | Failed Teachers | Power Students | Other Students |
|---------|---------------:|----------------:|---------------:|---------------:|
| Jalur Cerdas | 5% | 2% | **100%** | 98% |
| UKBI/TKA | 5% | 12% | **58%** | 41% |
| Karya | **10%** | 1% | **94%** | 93% |
| AI Tools | **70%** | 17% | 16% | 10% |

**Insight:** Students use Jalur Cerdas and Karya at near-universal rates regardless of teacher power. The teacher's power score predicts teacher behavior (AI, class management), not student behavior. Students drive their own learning.

---

## §5 Activation Funnel

```
Signed up (478 teachers)
  │
  ├─ Created class: 50/478 (10.5%) ← CLIFF #1: 89.5% drop here
  │     │
  │     ├─ Got students: 16/50 (32%) ← CLIFF #2: 68% drop here
  │     │     │
  │     │     ├─ Students learned: 8/16 (50%) ← CLIFF #3: 50% drop here
  │     │     │     │
  │     │     │     └─ POWER TEACHERS (top 20, score >12)
  │     │     │
  │     │     └─ Created class, has students, no learning yet: 8/16
  │     │
  │     └─ Created class, 0 students: 34/50 (68%)
  │
  └─ Never created class: 428/478 (89.5%) ← FAILED TEACHERS
```

### Funnel Metrics

| Stage | Count | % of Total | Drop-off |
|-------|------:|-----------:|---------:|
| Signed up | 478 | 100% | — |
| Created class | 50 | 10.5% | 89.5% |
| Got students | 16 | 3.3% | 68% of class-creators |
| Students learned | 8 | 1.7% | 50% of student-getters |
| Power teacher | 7 | 1.5% | — |

---

## §6 The Single Strongest Predictor

**School linkage.**

| Metric | School-Linked | Self-Registered | Multiplier |
|--------|-------------:|----------------:|----------:|
| D30 retention | 24.1% | 4.3% | **5.6×** |
| Avg learning events | 2.46 | 0.42 | **5.9×** |
| Avg active days | 0.50 | 0.12 | **4.2×** |

A student who joins through a teacher (school-linked) is 5.6× more likely to be active 30 days later. This is the single strongest growth lever in the entire dataset.

---

## §7 Implications

### For Product
1. **Onboarding wizard is the #1 priority.** 89.5% of teachers never create a class. A guided "Create Your First Class" flow could move the needle more than any feature.
2. **Invitation flow is #2.** 68% of class-creators get 0 students. A shareable link/code system is critical.
3. **3 students is the magic number.** Teachers with 3+ students have 73% retention vs 40% for any class. Focus on getting teachers to 3 students, not just 1.

### For GTM
1. **School partnerships are the highest-leverage channel.** Find 10 more schools like SMP Santa Laurensia. Each school = 100+ students with 5.6× retention.
2. **Teacher Success Guide from top 15.** Interview them, document their path, turn it into onboarding content.
3. **"Invite a colleague" feature.** Multi-teacher schools have higher retention — teachers keep each other engaged.

### For Investors
1. **The product works for those who find it.** Top 15 teachers brought 444 students with 24% D30 retention. The engagement is real.
2. **The problem is activation, not retention.** Once teachers get 3+ students, retention is strong. The funnel break is at class creation (89.5% drop) and student invitation (68% drop).
3. **School-linked growth is the path to 10×.** Each school partnership = 100+ students with 5.6× better retention than self-registered.
