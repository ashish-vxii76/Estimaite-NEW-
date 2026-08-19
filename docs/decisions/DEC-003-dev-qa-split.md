# DEC-003 Dev/QA split

PRD requires Dev SP + QA SP = Total SP and configurable allocation from complexity characteristics.

Default: `qaShare = clamp(0.12 + (QA/5)*0.28 + (NFR/5)*0.08, 0.15, 0.50)` then QA SP is rounded to 2 decimals and Dev SP is the remainder.
