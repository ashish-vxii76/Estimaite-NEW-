# Data model

Relational entities: User, Team, TeamMember, Location, Estimate, EstimateVersion, Approval, ActualDelivery, AuditEvent, ConfigurationVersion.

Configuration mappings (dimensions, bands, SP maps, governance thresholds) are stored as versioned JSON on `ConfigurationVersion.payload` so historical estimates can reload the exact ruleset.

SQLite is the MVP database for zero-ops local/cloud boot. Production should point Prisma at PostgreSQL without changing domain code.
