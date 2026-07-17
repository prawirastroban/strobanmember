// Phase 5.4A — Runtime Binding: connects Digital SPK Canvas to the
// existing Dynamic Form Runtime (Phase 4.5). This module does NOT introduce
// new business logic — it only wires SchemaBuilder / ValidationEngine /
// VisibilityEngine / ConditionalEngine outputs into React state.
//
// Behaviour:
//  - On mount, attempts SchemaBuilder.buildByCode(templateCode, ctx).
//  - If the template is not seeded yet in DB the provider degrades to a
//    "no_template" status but keeps a shared value store so the canvas keeps
//    working. Once metadata is seeded, the same components immediately become
//    driven by RuntimeSchema (visibility, required, disabled, validation)
//    without further code changes.
//  - Every value mutation rebuilds the schema (pure, memoised) so conditional
//    rules re-evaluate.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SchemaBuilder,
  ValidationEngine,
  type FormRuntimeContext,
  type FormStructure,
  type RuntimeField,
  type RuntimeSchema,
  type RuntimeSection,
  type ValidationOutcome,
} from "@/runtime/form";
import { FormService } from "@/services/spk/FormService";
import type { SpkActor, SpkStatus } from "@/services/spk/types";
import {
  resolveSectionAccess,
  subscribeRoleProfiles,
} from "@/runtime/form/RoleProfiles";
import {
  OperationalConfigService,
  DEFAULT_APPROVAL_MATRIX,
  type ApprovalMatrixConfig,
} from "@/services/spk/OperationalConfigService";
import { RuntimeBus } from "@/runtime/spk/RuntimeBus";

export type FormRuntimeStatus = "loading" | "ready" | "no_template" | "error";

export interface FieldBindingMeta {
  visible: boolean;
  disabled: boolean;
  required: boolean;
  error?: string;
  /** true when the field code is known to the RuntimeSchema. */
  bound: boolean;
}

interface FormRuntimeContextValue {
  status: FormRuntimeStatus;
  error: string | null;
  schema: RuntimeSchema | null;
  values: Record<string, unknown>;
  issues: Record<string, string>;
  role: SpkActor;
  workflowState: SpkStatus | null;
  approvalMatrix: ApprovalMatrixConfig;
  /** True once the first DB hydration pass has completed. While false,
   *  autosave / seeding effects should be inert to avoid clobbering the
   *  persisted `spk_orders.data` with empty `useBinding` defaults. */
  hydrated: boolean;

  getField: (code: string) => RuntimeField | null;
  getSection: (code: string) => RuntimeSection | null;
  setValue: (code: string, v: unknown) => void;
  validateAll: () => ValidationOutcome;
  clearIssues: () => void;

  // Repeatable section helpers
  getRows: (sectionCode: string) => Record<string, unknown>[];
  setRowValue: (sectionCode: string, index: number, code: string, v: unknown) => void;
  addRow: (sectionCode: string) => void;
  removeRow: (sectionCode: string, index: number) => void;
}

const RuntimeCtx = createContext<FormRuntimeContextValue | null>(null);

/**
 * SectionScope — internal context set by <CanvasSection> so that any
 * useBinding() call rendered inside a read-only section automatically
 * inherits `disabled=true`, without React components needing to know the
 * active role. Canvas stays a pure renderer.
 */
interface SectionScope {
  code: string;
  editable: boolean;
}
export const SectionScopeCtx = createContext<SectionScope | null>(null);

interface ProviderProps {
  templateCode: string;
  role?: SpkActor;
  workflowState?: SpkStatus | null;
  flags?: Record<string, unknown>;
  initialValues?: Record<string, unknown>;
  /**
   * When false, the provider will NOT run the first-hydration pass yet —
   * typically used while a real SPK row is still being fetched so that the
   * empty `{}` seed doesn't get treated as authoritative and lock out the
   * real DB data. Defaults to true (backward compat).
   */
  initialValuesReady?: boolean;
  children: ReactNode;
}

export function FormRuntimeProvider({
  templateCode,
  role = "reception",
  workflowState = null,
  flags,
  initialValues,
  initialValuesReady = true,
  children,
}: ProviderProps) {
  const [status, setStatus] = useState<FormRuntimeStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<FormStructure | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...(initialValues ?? {}) }));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const initialValuesSignature = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);

  // Hydrate DB values only once per provider lifetime. Subsequent
  // `initialValues` changes (usually the echo from autosave's onSaved) must
  // NOT overwrite live runtime values — otherwise a fast GOOD→OK→BAD click
  // sequence can be clobbered by an in-flight save round-trip that carried
  // the pre-click value. New server-only keys are still merged in.
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState<boolean>(() => initialValuesReady && !!initialValues);
  useEffect(() => {
    if (!initialValues) return;
    // Wait until the caller signals the DB row is loaded. This prevents the
    // empty `{}` pass (spkRow still null) from being counted as the
    // authoritative first hydration and swallowing the real data that
    // arrives moments later.
    if (!initialValuesReady) return;
    setValues((prev) => {
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        // First hydration: DB row is authoritative — overwrite any values
        // that useBinding() may have seeded with defaults (false, {}, [], "",
        // null, undefined). The caller gates `initialValuesReady` until the
        // real row is loaded, so no genuine user edit can exist yet.
        // Keys the runtime already has but the DB does not are preserved.
        return { ...prev, ...initialValues };
      }
      // Later echoes: never overwrite existing runtime keys. Only fill in
      // keys the runtime doesn't know about yet.
      let changed = false;
      const next = { ...prev };
      for (const [k, v] of Object.entries(initialValues)) {
        if (!(k in prev)) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (!hydratedRef.current) setIssues({});
    if (!hydrated) setHydrated(true);
    // `initialValuesSignature` lets the Runtime hydrate DB-loaded SPK data
    // after the provider has mounted without resetting on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesSignature, initialValuesReady]);

  // Phase 5.7 — pull Operational Configuration (role profiles etc.) into
  // Runtime. Any subsequent Owner edit invalidates the cache and re-hydrates
  // the module-level RoleProfiles map, at which point subscribeRoleProfiles
  // bumps `configTick` so useSectionBinding recomputes.
  const [, setConfigTick] = useState(0);
  const [approvalMatrix, setApprovalMatrix] = useState<ApprovalMatrixConfig>(
    () => OperationalConfigService.getApprovalMatrix(),
  );
  useEffect(() => {
    void OperationalConfigService.load().then(() =>
      setApprovalMatrix(OperationalConfigService.getApprovalMatrix()),
    );
    const unsubRoles = subscribeRoleProfiles(() => setConfigTick((t) => t + 1));
    const unsubBus = RuntimeBus.subscribe("config-updated", () => {
      setApprovalMatrix(OperationalConfigService.getApprovalMatrix());
      setConfigTick((t) => t + 1);
    });
    return () => {
      unsubRoles();
      unsubBus();
    };
  }, []);

  // Load metadata once.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const tpl = await FormService.getActiveTemplateByCode(templateCode);
        if (cancelled) return;
        if (!tpl.ok || !tpl.data?.current_version_id) {
          setStatus("no_template");
          return;
        }
        const s = await FormService.loadStructure(tpl.data.current_version_id);
        if (cancelled) return;
        if (!s.ok || !s.data) {
          setStatus("no_template");
          return;
        }
        setStructure(s.data);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "form_runtime_load_failed");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateCode]);

  const ctx: FormRuntimeContext = useMemo(
    () => ({ role, workflow_state: workflowState, values, flags }),
    [role, workflowState, values, flags],
  );

  const schema = useMemo<RuntimeSchema | null>(() => {
    if (!structure) return null;
    return SchemaBuilder.build(structure, ctx);
  }, [structure, ctx]);

  const setValue = useCallback((code: string, v: unknown) => {
    setValues((prev) => (prev[code] === v ? prev : { ...prev, [code]: v }));
    setIssues((prev) => {
      if (!(code in prev)) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }, []);

  const getField = useCallback(
    (code: string) => schema?.field_index[code] ?? null,
    [schema],
  );

  const getSection = useCallback(
    (code: string) => schema?.sections.find((s) => s.code === code) ?? null,
    [schema],
  );

  const validateAll = useCallback((): ValidationOutcome => {
    if (!schema) {
      setIssues({});
      return { ok: true };
    }
    const outcome = ValidationEngine.validate(schema, values);
    if (outcome.ok === false) {
      const map: Record<string, string> = {};
      outcome.issues.forEach((i) => {
        if (!map[i.field_code]) map[i.field_code] = i.message;
      });
      setIssues(map);
    } else {
      setIssues({});
    }
    return outcome;
  }, [schema, values]);

  const clearIssues = useCallback(() => setIssues({}), []);

  const getRows = useCallback(
    (sectionCode: string) => {
      const raw = values[sectionCode];
      return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    },
    [values],
  );

  const setRowValue = useCallback(
    (sectionCode: string, index: number, code: string, v: unknown) => {
      setValues((prev) => {
        const rows = Array.isArray(prev[sectionCode])
          ? [...(prev[sectionCode] as Record<string, unknown>[])]
          : [];
        rows[index] = { ...(rows[index] ?? {}), [code]: v };
        return { ...prev, [sectionCode]: rows };
      });
    },
    [],
  );

  const addRow = useCallback((sectionCode: string) => {
    setValues((prev) => {
      const rows = Array.isArray(prev[sectionCode])
        ? [...(prev[sectionCode] as Record<string, unknown>[])]
        : [];
      rows.push({});
      return { ...prev, [sectionCode]: rows };
    });
  }, []);

  const removeRow = useCallback((sectionCode: string, index: number) => {
    setValues((prev) => {
      const rows = Array.isArray(prev[sectionCode])
        ? [...(prev[sectionCode] as Record<string, unknown>[])]
        : [];
      rows.splice(index, 1);
      return { ...prev, [sectionCode]: rows };
    });
  }, []);

  const value: FormRuntimeContextValue = {
    status,
    error,
    schema,
    values,
    issues,
    role,
    workflowState,
    approvalMatrix,
    hydrated,
    getField,
    getSection,
    setValue,
    validateAll,
    clearIssues,
    getRows,
    setRowValue,
    addRow,
    removeRow,
  };

  return <RuntimeCtx.Provider value={value}>{children}</RuntimeCtx.Provider>;
}

export function useFormRuntime(): FormRuntimeContextValue {
  const v = useContext(RuntimeCtx);
  if (!v) {
    throw new Error("useFormRuntime must be used inside <FormRuntimeProvider>");
  }
  return v;
}

export function useFormRuntimeSafe(): FormRuntimeContextValue | null {
  return useContext(RuntimeCtx);
}

/**
 * useBinding — drop-in replacement for `useState` that routes through the
 * runtime store. If the field code is declared in RuntimeSchema, `meta` is
 * derived from it (visibility, disabled, required, error). Otherwise the
 * value is stored in the shared runtime map as a plain key.
 */
export function useBinding<T>(
  code: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void, FieldBindingMeta] {
  const rt = useFormRuntimeSafe();
  const scope = useContext(SectionScopeCtx);
  const seeded = useRef(false);

  useEffect(() => {
    if (!rt || seeded.current) return;
    // Do not seed the runtime store with `initial` (usually an empty default)
    // until the provider has finished its first DB hydration pass. Seeding
    // before hydration would inject "" / false / {} into runtime.values,
    // which the debounced autosave could then persist over the real DB
    // fields when a mechanic/admin re-opens an existing SPK.
    if (!rt.hydrated) return;
    seeded.current = true;
    if (rt.values[code] === undefined) rt.setValue(code, initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt?.hydrated]);

  // Fallback when no provider is mounted.
  const [local, setLocal] = useState<T>(initial);
  if (!rt) {
    return [
      local,
      setLocal,
      { visible: true, disabled: false, required: false, bound: false },
    ];
  }

  const raw = rt.values[code];
  const value = (raw === undefined ? initial : (raw as T));
  const setValue = (v: T | ((prev: T) => T)) => {
    // Read-only section: swallow writes so the UI never mutates values the
    // active role is not permitted to change.
    if (scope && !scope.editable) return;
    const next =
      typeof v === "function"
        ? (v as (prev: T) => T)(value)
        : v;
    rt.setValue(code, next);
  };

  const field = rt.getField(code);
  const sectionReadOnly = !!scope && !scope.editable;
  const meta: FieldBindingMeta = field
    ? {
        visible: field.visible,
        disabled: field.disabled || sectionReadOnly,
        required: field.required,
        error: rt.issues[code],
        bound: true,
      }
    : {
        visible: true,
        disabled: sectionReadOnly,
        required: false,
        error: rt.issues[code],
        bound: false,
      };

  return [value, setValue, meta];
}

/** Section-level binding for visibility / repeatable presence. */
export function useSectionBinding(sectionCode: string) {
  const rt = useFormRuntimeSafe();
  if (!rt)
    return {
      visible: true,
      editable: true,
      bound: false,
      repeatable: null,
      section: null as RuntimeSection | null,
    };
  const section = rt.getSection(sectionCode);
  const access = resolveSectionAccess(rt.role, sectionCode);
  // A section is visible only if BOTH the schema (when present) and the role
  // profile permit it. Editable requires both as well.
  const schemaVisible = section ? section.visible : true;
  // Operational Configuration gate — the Approval section only makes sense
  // when at least one of Final Check Mekanik / Final Approval is required.
  // Owner-driven.
  let matrixVisible = true;
  if (sectionCode === "approval") {
    const m = rt.approvalMatrix;
    matrixVisible = m.qc_required || m.final_approval;
  }
  return {
    visible: schemaVisible && access.visible && matrixVisible,
    editable: access.editable,
    bound: !!section,
    repeatable: section?.repeatable ?? null,
    section,
  };
}