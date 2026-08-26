# DEC-005 Sprint-constrained capacity

**Corrected.** Sprint-constrained required resources use **AI-adjusted** capacity, per the
authoritative PRD §6.5:

```
req_dev = max(1, roundup(dev_sp / (target_sprints × ai_dev_capacity)))
req_qa  = max(1, roundup(qa_sp  / (target_sprints × ai_qa_capacity)))
```

AI Productivity % is "applied once, at capacity", and that AI-adjusted capacity drives both
required-resources and sprint count. An earlier version of this record wrongly stated "base
capacity" — that contradicted §6.5 and has been reverted in `planning.ts`.
