# Volunteerhub — User Feedback Report

> **Status: TEMPLATE. No user testing has been conducted yet.**
> Fill in this document only with real observations from real participants. Do not invent feedback.

---

## Part A. Testing kit (use before and during sessions)

### A1. Test setup

- Prototype URL: `https://volunteerhub.<subdomain>.workers.dev`
- Session length: 30–40 minutes, moderated (in person or video call), screen shared
- Device mix: aim for at least 50% of sessions on a phone
- Ask for consent to take notes and, optionally, record the screen. Store recordings privately.
- Use a fresh browser profile or incognito window for each participant.

### A2. Suggested participants (5–8 people is enough for a first round)

| Segment | Target count | Example |
|---|---|---|
| Donor who often gives via Telegram/Instagram | 2–3 | Student, office worker |
| Small volunteer / organizer without a large audience | 2–3 | Person running their own jar |
| Representative of a foundation or company | 1–2 | HR / CSR manager, foundation staff |

### A3. Test scenarios (read them aloud; don't explain the UI)

1. **First impression (2 min).** Open the homepage. "What is this site for? Who is it for?"
2. **Discovery.** "Find a fundraiser for medicine in Kyiv that you would trust." Observe search, filters and sorting.
3. **Trust check.** On a campaign page: "How would you decide whether this fundraiser is legitimate?" Observe whether they notice the verification checklist, timeline, budget and the "organizer-reported" label.
4. **Donate flow.** "Show me how you would donate." *(They shouldn't complete a real payment.)* Did they understand that the money goes directly to Monobank?
5. **Sign up and follow.** Register, follow a campaign, and share it (copy the link).
6. **Gamification.** Open "Мій вплив". "What do XP, levels and missions mean to you? Would they motivate you?"
7. **Organizer flow.** "Create a fundraiser for a generator for a hospital." Go through all 5 wizard steps up to submission. *(Test jar link: `https://send.monobank.ua/jar/TESTJAR123` passes format validation only.)*
8. **Organizer management.** In "Мої збори", update the raised amount and publish an update.
9. **Communities.** Join a community and a challenge. "Would you use this with your university or company?"
10. **Pricing.** Open the pricing page. "Is it clear what is free and what is paid?"

### A4. Short questionnaire (after the session)

Scale 1–5 (1 = strongly disagree, 5 = strongly agree):

1. I understood what Volunteerhub is within the first minute.
2. It was easy to find a relevant fundraiser.
3. I understood which checks a campaign had passed.
4. I trust campaigns on Volunteerhub more than random links in social media.
5. It was clear that donations go directly to the organizer's Monobank jar.
6. Creating a fundraiser was simple.
7. XP, levels and achievements would motivate me to participate more.
8. The design looks modern and trustworthy.
9. The site worked well on my phone *(if tested on mobile)*.
10. I would recommend Volunteerhub to a friend. *(0–10 NPS scale)*

Open questions:

- What was the most confusing moment?
- What would make you trust a fundraiser more?
- What is missing that you would expect?
- If you are an organizer: would you move your fundraisers here? Why / why not?

### A5. Feedback collection template (one copy per participant)

```
Participant ID: P__        Date: ____-__-__     Moderator: ______
Segment: donor / organizer / organization     Device: desktop / mobile (model)
Consent obtained: yes / no                    Recording: yes / no

Scenario | Completed? (yes / with help / no) | Time | Observations / quotes
---------|-----------------------------------|------|----------------------
1 First impression |  |  |
2 Discovery        |  |  |
3 Trust check      |  |  |
4 Donate flow      |  |  |
5 Sign up & follow |  |  |
6 Gamification     |  |  |
7 Create campaign  |  |  |
8 Manage campaign  |  |  |
9 Communities      |  |  |
10 Pricing         |  |  |

Questionnaire scores: Q1 _ Q2 _ Q3 _ Q4 _ Q5 _ Q6 _ Q7 _ Q8 _ Q9 _ NPS _
Top 3 issues observed:
1.
2.
3.
Notable quotes:
```

---

## Part B. Report (fill in after testing)

### 1. Summary

_2–4 sentences: what was tested, the main findings, the most important changes made._

### 2. Who tested Volunteerhub

| ID | Segment | Age range | Device | Experience with fundraising |
|---|---|---|---|---|
| P1 |  |  |  |  |

### 3. How many people participated

- Total participants: __
- Sessions: __ moderated, __ unmoderated
- Dates: __ to __

### 4. Which features they tried

| Feature | # participants who tried | Task success rate |
|---|---|---|
| Discovery & search |  |  |
| Campaign page & trust signals |  |  |
| Registration / login |  |  |
| Follow / share |  |  |
| Campaign creation wizard |  |  |
| Organizer dashboard |  |  |
| Gamification (XP, missions, badges) |  |  |
| Communities & challenges |  |  |

### 5. What they liked

- _Finding (with participant IDs and quotes)_

### 6. Difficulties they experienced

| # | Issue | Participants | Severity (low/med/high) | Evidence |
|---|---|---|---|---|
| 1 |  |  |  |  |

### 7. Questionnaire results

| Question | Mean | Min | Max |
|---|---|---|---|
| Q1 … Q9 |  |  |  |
| NPS |  |  |  |

### 8. Changes made based on feedback

| Issue # | Change | PR / commit | Status |
|---|---|---|---|
|  |  |  |  |

### 9. Next steps

- _What to test in the next round_
