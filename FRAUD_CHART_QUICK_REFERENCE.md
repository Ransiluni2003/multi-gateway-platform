# 🎯 Fraud Chart Quick Reference Cards

## 📌 Card 1: What Am I Looking At?

```
┌─────────────────────────────────────────────────────┐
│         FRAUD TRENDLINE & REFUND RATIO CHART       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  RED LINE 🔴 = Fraud Events                        │
│  - What: Number of fraudulent transactions/day     │
│  - Scale: 0, 5, 10, 15, 20+ incidents             │
│  - Axis: LEFT (Count)                              │
│                                                     │
│  BLUE LINE 🔵 = Refund Ratio                       │
│  - What: % of payments refunded each day           │
│  - Formula: (Refunds ÷ Payments) × 100             │
│  - Scale: 0%, 5%, 10%, 15%, 20%+                   │
│  - Axis: RIGHT (Percentage)                        │
│                                                     │
│  TIME: 14 days (last two weeks)                    │
│                                                     │
│  LEGEND: Hover over points to see exact values     │
└─────────────────────────────────────────────────────┘
```

---

## 🟢 Card 2: Chart Looks HEALTHY

```
┌─────────────────────────────────────────────────────┐
│  ✅ ALL GOOD - No Action Needed                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✓ Red line: Staying 3-8 incidents/day            │
│  ✓ Blue line: Staying 2-5% range                  │
│  ✓ Both lines relatively flat                      │
│  ✓ No sudden spikes or drops                       │
│  ✓ Patterns are predictable                        │
│                                                     │
│  WHAT TO DO:                                       │
│  → Continue monitoring                             │
│  → Look for trends day-to-day                      │
│  → Note baseline for comparison                    │
│                                                     │
│  METRIC RANGES:                                    │
│  Fraud Rate:    0-5%     ✅                        │
│  Refund Ratio:  1-5%     ✅                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🟠 Card 3: Chart Looks CONCERNING

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ ELEVATED - Investigate                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  WARNING SIGNS:                                    │
│  • Red line jumped from 5 → 15+ incidents         │
│  • Blue line increased from 2% → 8%+              │
│  • Both lines spike together                       │
│  • New high points appearing                       │
│  • Trend is worsening (day over day)               │
│                                                     │
│  LIKELY CAUSES:                                    │
│  ? Fraud attack or bot activity                   │
│  ? Payment processor misconfiguration              │
│  ? Threshold rules changed                         │
│  ? Legitimate business volume spike                │
│                                                    │
│  IMMEDIATE ACTIONS:                                │
│  1. Check fraud detection logs                     │
│  2. Look for patterns (same card, email, IP?)     │
│  3. Contact payment processor                      │
│  4. Review recent code changes                     │
│                                                    │
│  METRIC RANGES:                                    │
│  Fraud Rate:    5-10%    ⚠️                        │
│  Refund Ratio:  5-10%    ⚠️                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔴 Card 4: Chart Looks CRITICAL

```
┌─────────────────────────────────────────────────────┐
│  🔴 CRITICAL - Immediate Action Required           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  EMERGENCY SIGNS:                                  │
│  • Red line spiked massively (5 → 40+)            │
│  • Blue line extremely high (2% → 20%+)           │
│  • Both metrics far above normal                   │
│  • Rapidly deteriorating trend                     │
│  • Sustained at high levels                        │
│                                                    │
│  STOP & INVESTIGATE:                               │
│  1. 🔴 PAUSE: Check payment processor              │
│  2. 🔴 REVIEW: Latest code deployment             │
│  3. 🔴 CHECK: Fraud detection rules                │
│  4. 🔴 CONTACT: Support teams immediately          │
│  5. 🔴 CONSIDER: Rollback if recent change        │
│                                                    │
│  LIKELY CAUSES:                                    │
│  🚨 Coordinated fraud attack                       │
│  🚨 System misconfiguration (all flagged fraud)   │
│  🚨 Payment processor failure                      │
│  🚨 Data corruption                                │
│                                                    │
│  METRIC RANGES:                                    │
│  Fraud Rate:    15%+     🔴                        │
│  Refund Ratio:  15%+     🔴                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Card 5: Metric Interpretation Matrix

```
┌──────────────┬──────────────┬──────────────────────┐
│ Fraud Events │ Refund Ratio │ Likely Cause         │
├──────────────┼──────────────┼──────────────────────┤
│              │              │                      │
│ LOW (↓)      │ LOW (↓)      │ ✅ Healthy System    │
│ 3-5 /day     │ 2-3%         │    All good!         │
│              │              │                      │
├──────────────┼──────────────┼──────────────────────┤
│              │              │                      │
│ HIGH (↑)     │ HIGH (↑)     │ ⚠️ Attack/Fraud     │
│ 15+ /day     │ 8-12%        │    Both spike       │
│              │              │    together         │
│              │              │                      │
├──────────────┼──────────────┼──────────────────────┤
│              │              │                      │
│ LOW (↓)      │ HIGH (↑)     │ 📉 Quality Issue    │
│ 2-5 /day     │ 8-12%        │    Not fraud, but   │
│              │              │    customers upset  │
│              │              │                      │
├──────────────┼──────────────┼──────────────────────┤
│              │              │                      │
│ HIGH (↑)     │ LOW (↓)      │ ⏳ Slow Refunds     │
│ 15+ /day     │ 2-3%         │    Detection good,  │
│              │              │    processing slow  │
│              │              │                      │
└──────────────┴──────────────┴──────────────────────┘
```

---

## 🎯 Card 6: Action Decision Tree

```
START
  │
  └─→ Both lines flat?     → ✅ Continue monitoring
       (Healthy baseline)
  
  └─→ Red line only up?
       │
       └─→ Recent code     → 🔄 Check thresholds
           change?
       │
       └─→ Specific        → ⛔ Block region/card
           pattern?
  
  └─→ Blue line only up?
       │
       └─→ All fraud?      → 📉 Product issue
           │
           └─→ Just        → 🛫 Shipping issue
               refunds?

  └─→ Both lines up?
       │
       ├─→ Extreme spike   → 🚨 CRITICAL (Card 4)
       │
       └─→ Modest increase → ⚠️ ELEVATED (Card 3)

  └─→ Both lines down?     → 📉 Something broke
                              Check API/database
```

---

## 📱 Card 7: How to Read Values

```
┌─────────────────────────────────────────────────────┐
│              READING THE CHART VALUES               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HOVER OVER RED DOT:                                │
│  Shows: "Fraud Events: 8"                           │
│  Means: 8 fraud incidents detected that day         │
│                                                     │
│  HOVER OVER BLUE DOT:                               │
│  Shows: "Refund Ratio: 4.2%"                        │
│  Means: 4.2% of that day's payments were refunded  │
│  Example: Out of 100 payments → 4 refunds          │
│                                                     │
│  READ TRENDS:                                       │
│  Jan 1:  5 fraud, 2%     ← Normal day              │
│  Jan 2:  4 fraud, 2.1%   ← Normal day              │
│  Jan 3:  6 fraud, 2.5%   ← Normal day              │
│  Jan 4: 14 fraud, 5%     ← SPIKE! Investigate      │
│                                                     │
│  CALCULATE DAILY IMPACT:                            │
│  If refund ratio is 3% and 200 payments happened:  │
│  Refunds = 200 × 0.03 = 6 refunds that day        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Card 8: When Lines Move Together vs Apart

```
┌─────────────────────────────────────────────────────┐
│         WHEN LINES MOVE TOGETHER 📈📈              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Both RED and BLUE rise at same time               │
│                                                     │
│  = COORDINATED ISSUE                               │
│    • Fraud attack hitting system                    │
│    • Bad transactions auto-refunded                 │
│    • Specific fraud pattern                         │
│                                                     │
│  ACTION: Block, investigate, implement 2FA         │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         WHEN LINES MOVE APART 📈📉               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  RED up, BLUE down (or vice versa)                 │
│                                                     │
│  = INDEPENDENT ISSUES                              │
│    • Fraud detection working                        │
│    • Refund processing delayed                      │
│    • Different root causes                          │
│                                                     │
│  ACTION: Separate investigations per metric        │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         WHEN LINES ARE FLAT ➡️➡️                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Both RED and BLUE stay at same level              │
│                                                     │
│  = STABLE SYSTEM                                   │
│    • Normal baseline established                    │
│    • Predictable patterns                           │
│    • No anomalies detected                          │
│                                                     │
│  ACTION: Continue routine monitoring               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📞 Card 9: Who to Contact & When

```
┌─────────────────────────────────────────────────────┐
│               ESCALATION CHART                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  LEVEL 1: Monitor Only (Healthy)                   │
│  • No action needed                                 │
│  • Continue checking dashboard daily                │
│                                                     │
│  LEVEL 2: Investigate (Elevated)                   │
│  • You: Check fraud logs, look for patterns        │
│  • Notify: Team lead                               │
│  • Timeline: Within 1 hour                          │
│                                                     │
│  LEVEL 3: Active Response (Concerning)             │
│  • You: Check logs, start investigation             │
│  • Notify: Engineering lead + Management           │
│  • Contact: Payment processor support              │
│  • Timeline: Immediate (within 30 min)             │
│                                                     │
│  LEVEL 4: Emergency (Critical)                     │
│  • You: Alert engineering immediately              │
│  • Notify: VP Engineering, Product lead            │
│  • Contact: Payment processor emergency line       │
│  • Consider: Pause payments, rollback if needed    │
│  • Timeline: IMMEDIATE (now)                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ Card 10: Quick Checklist for Spikes

```
┌─────────────────────────────────────────────────────┐
│    WHEN YOU SEE A SPIKE: 15-MINUTE ACTION PLAN      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ☐ Take a screenshot of the chart                  │
│                                                     │
│ ☐ Note the exact time/date of spike               │
│                                                     │
│ ☐ Check fraud detection logs:                      │
│   /api/fraud/logs or database query                │
│                                                     │
│ ☐ Look for patterns:                               │
│   - Same card used multiple times?                 │
│   - Same email domain?                             │
│   - Same IP address?                               │
│                                                     │
│ ☐ Check recent changes:                            │
│   - Code deployed in last 24 hours?               │
│   - Database changes?                              │
│   - Configuration updates?                         │
│                                                     │
│ ☐ Contact payment processor:                       │
│   - Tell them the exact time                       │
│   - Ask if they see issues on their end            │
│   - Provide screenshot                             │
│                                                     │
│ ☐ Post in team Slack with:                         │
│   - Time of spike                                  │
│   - Screenshot of chart                            │
│   - Findings so far                                │
│   - Next steps                                     │
│                                                     │
│ ☐ Monitor for next 30 minutes                      │
│   - Is it continuing?                              │
│   - Is it getting worse?                           │
│   - Is it resolving?                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Card 11: Resources & Links

```
┌─────────────────────────────────────────────────────┐
│            DOCUMENTATION & RESOURCES               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 Charts on Dashboard:                            │
│    http://localhost:3000/dashboard                 │
│                                                     │
│ 📖 Complete Guide:                                 │
│    See: FRAUD_CHART_GUIDE.md                       │
│                                                     │
│ 📝 README with Charts Section:                     │
│    See: README.md (Analytics section)              │
│                                                     │
│ ✅ Completion Report:                              │
│    See: FRAUD_CHART_COMPLETION.md                  │
│                                                     │
│ 🔌 API Endpoint:                                   │
│    GET /api/fraud/trend                            │
│    Returns: 14 days of fraud & refund data         │
│                                                     │
│ 💾 Raw Data:                                       │
│    MongoDB: db.transactionlogs.find()              │
│                                                     │
│ 🏃 Quick Start:                                    │
│    1. Open http://localhost:3000/dashboard         │
│    2. Click "Simulate Transaction"                 │
│    3. Watch chart update                           │
│    4. Hover over points to see values              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎓 Card 12: Learning Path

```
┌─────────────────────────────────────────────────────┐
│         HOW TO MASTER FRAUD CHART READING           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ DAY 1: Learn What You're Looking At                │
│  → Read Card 1 (What am I looking at?)             │
│  → Open dashboard: /dashboard                      │
│  → Understand: Red = fraud, Blue = refunds         │
│                                                     │
│ DAY 2: Understand Healthy Patterns                 │
│  → Read Card 2 (Healthy chart)                     │
│  → Read Card 5 (Interpretation matrix)             │
│  → Generate demo data to see patterns              │
│                                                     │
│ DAY 3: Learn to Spot Problems                      │
│  → Read Card 3 (Concerning)                        │
│  → Read Card 4 (Critical)                          │
│  → Understand escalation levels                    │
│                                                     │
│ DAY 4: Practice Interpretation                     │
│  → Create fake fraud transactions                  │
│  → See how chart responds                          │
│  → Practice reading values (Card 7)                │
│                                                     │
│ DAY 5: Know What to Do                             │
│  → Read Card 9 (Who to contact)                    │
│  → Read Card 10 (Action checklist)                 │
│  → Practice decision tree (Card 6)                 │
│                                                     │
│ ONGOING: Monitor & Learn                           │
│  → Check dashboard daily                           │
│  → Note patterns and trends                        │
│  → Share findings with team                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

**Print these cards and keep them handy for quick reference! 🎯**

*Last Updated: January 3, 2026*
