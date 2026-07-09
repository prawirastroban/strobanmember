// Phase 4.3 — Runtime Engine barrel.
//
// Diagram (DAG, no back-edges to Core):
//
//   ┌──────────────┐        ┌───────────────┐
//   │ StateEngine  │◀───────│ WorkflowEngine│
//   └─────┬────────┘        └──────┬────────┘
//         │ reads spk_orders       │ delegates → WorkflowService
//         ▼                        ▼
//   ┌──────────────────────────────────────┐
//   │            EventEngine               │  fan-out to subscribers
//   │  (append via EventService, notifies) │
//   └──────┬─────────────────────┬─────────┘
//          │                     │
//          ▼                     ▼
//   TimelineEngine        AutomationEngine
//   (read projection)     ├─ analytics bump (AnalyticsService)
//                         ├─ notification hook (no-op, future)
//                         ├─ AI hook (no-op, future)
//                         └─ custom handlers via register()
//
// Rules:
//   1. Runtime does not import from React, DOM, or any UI code.
//   2. All status changes flow through WorkflowEngine.run().
//   3. All actions producing side-effects emit via EventEngine.emit().
//   4. Automation is extensible; new handlers plug in through AutomationEngine.register().
//   5. UI (Phase 4.4+) will only call runtime engines and service layer — never Supabase directly.

export { EventEngine, type EventSubscriber } from "./EventEngine";
export { StateEngine } from "./StateEngine";
export { WorkflowEngine } from "./WorkflowEngine";
export { TimelineEngine, type TimelineEntry } from "./TimelineEngine";
export { AutomationEngine, type AutomationHandler } from "./AutomationEngine";
export { SPKOrchestrator, type SPKOrchestratorApi } from "./SPKOrchestrator";
