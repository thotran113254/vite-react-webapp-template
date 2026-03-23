---
title: "Customer Feedback Implementation - AI Homesworld Travel"
description: "13 feedback items across 5 phases: quick wins, UI enhancements, pricing redesign, new modules, admin analytics"
status: pending
priority: P1
effort: 18-26d
branch: main
tags: [feedback, customer, pricing, modules, analytics, branding]
created: 2026-03-23
---

# Customer Feedback Implementation Plan

**Source**: [Feedback Analysis Report](../reports/feedback-review-260323-0935-customer-feedback-analysis.md)
**Items**: 13 feedback items from customer (Google Sheets + 16 annotated screenshots)

## Phase Overview

| # | Phase | FBs | Effort | Status |
|---|-------|-----|--------|--------|
| 1 | [Quick Wins & Branding](phase-01-quick-wins-and-branding.md) | FB-01,03s,07s,10.1,11,12 | 1-2d | completed |
| 2 | [Image Upload & UI Enhancements](phase-02-image-upload-and-ui-enhancements.md) | FB-06,07,03,05,02.1 | 2-3d | completed |
| 3 | [Pricing System Redesign](phase-03-pricing-system-redesign.md) | FB-04,10.2 | 5-7d | pending |
| 4 | [New Modules](phase-04-new-modules.md) | FB-08,09,13 | 5-7d | pending |
| 5 | [Admin Analytics & Reporting](phase-05-admin-analytics-and-reporting.md) | FB-02.2,02.3,02.4 | 5-7d | pending |

## Dependencies

```
Phase 1.3 (schema: propertyCode, transport images) --> Phase 2 (UI uses new fields)
Phase 1.5 (disable combo types) --> Phase 3 (pricing redesign assumes per-night only)
Phase 4.1 (market_knowledge_updates table) --> Phase 4.3 (contribution workflow extends it)
Phase 1.2 (branding) --> BLOCKED: need hex codes from customer
```

## Key Risks

1. **FB-04 pricing redesign** is XL scope; current unique index on `(roomId, comboType, dayType, seasonName)` must change
2. **FB-13 workflow** touches KB + AI context sync; needs careful approval state machine
3. **Branding colors** not yet provided by customer

## Unresolved Questions

1. Brand hex codes for Homesworld Travel?
2. FB-04: "T6+CN" pricing = per-night or per-pair?
3. FB-04: Hide prices from ALL user-role staff or specific roles?
4. FB-04: Child surcharge age ranges dynamic or predefined (<5, 5-12, >12)?
5. FB-13: Approved KB auto-sync immediate or batch?
6. FB-02.3: Usage time = login-logout or active chat duration?
7. FB-05: Show price/night on property cards?
