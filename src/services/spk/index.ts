// Phase 4.2 — Core Service Layer barrel.
// All Digital SPK business logic lives here. No UI. No hooks. No pages.
//
// Dependency diagram (DAG, no cycles):
//
//   SPKService ─────────┬─▶ WorkflowService ─┐
//                       │                    │
//                       ├───────────────────▶ EventService ─▶ TimelineService
//                       │                                        │
//   ApprovalService ────┤                                        │
//   InspectionService ──┤                                        │
//   RecommendationService ── reads Inspection ─▶ EventService ───┘
//                       │
//   FormService ────────┘ (metadata only, no writes to Core)
//
//   AnalyticsService  ◀── reads events (via a projection layer); never writes to Core.
//
// Rules enforced by this layer:
//   1. All status changes go through WorkflowService.
//   2. All activity emits an event via EventService.
//   3. Every event yields a Timeline row via TimelineService projection.
//   4. Every relevant event maps to a KPI via AnalyticsService.metricCodeFor.
//   5. UI never talks to supabase for SPK domain — only to these services.

export * from "./types";
export { SPKService } from "./SPKService";
export { WorkflowService } from "./WorkflowService";
export { EventService } from "./EventService";
export { TimelineService } from "./TimelineService";
export { ApprovalService } from "./ApprovalService";
export { FormService } from "./FormService";
export { InspectionService } from "./InspectionService";
export { RecommendationService } from "./RecommendationService";
export { AnalyticsService } from "./AnalyticsService";
