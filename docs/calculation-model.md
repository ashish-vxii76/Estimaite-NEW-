# Calculation model

Formulas follow PRD v1.0:

- Complexity Index = SUM(score × weight) / SUM(maxScore × weight)
- AI Adjusted Capacity = Base Capacity × (1 + AI %)
- Resource-constrained: Final Sprints = ROUNDUP(MAX(Dev Sprints, QA Sprints))
- Sprint-constrained required headcount uses **base** capacity, not AI-adjusted capacity
- Resource delivery cost = Resource-Sprints × Resource Cost per Sprint
- Team delivery cost = Sprints × full team sprint rate (not prorated)
- Adjusted effort = SP × days/point × complexity multiplier / (1 + AI %)
- AI savings applied once via capacity → duration → commercial cost

Default band boundaries, Dev/QA split coefficients and confidence cutovers are in `docs/decisions/` because the Excel workbook was not attached.
