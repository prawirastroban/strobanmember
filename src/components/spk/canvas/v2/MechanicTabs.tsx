// SPK Canvas v2 — Mechanic 3-tab layout (Safety / General / Estimasi).
// Mengikuti mockup Digital SPK Stroban yang diunggah user.
import { useState } from "react";
import { ChecklistGroup } from "./ChecklistGroup";
import { ConditionRow } from "./ConditionRow";
import { LampsRow } from "./LampsRow";
import { TyreCheckPanel } from "./TyreCheckPanel";
import { EstimasiTable } from "./EstimasiTable";

type TabId = "safety" | "general" | "estimasi";

const TABS: { id: TabId; label: string }[] = [
  { id: "safety", label: "Safety Check" },
  { id: "general", label: "General Check Up" },
  { id: "estimasi", label: "Estimasi" },
];

export function MechanicTabs() {
  const [tab, setTab] = useState<TabId>("safety");

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 shadow-xl backdrop-blur-xl overflow-hidden">
      {/* Tab header */}
      <div className="flex flex-wrap p-3 gap-2 border-b border-white/10 bg-white/5 backdrop-blur-md">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-lg border font-bold text-xs md:text-sm tracking-wide uppercase transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_-4px_hsl(var(--primary)/0.6)]"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 md:p-6 animate-fade-in">
        {tab === "safety" && <SafetyPanel />}
        {tab === "general" && <GeneralPanel />}
        {tab === "estimasi" && <EstimasiTable />}
      </div>
    </div>
  );
}

function SafetyPanel() {
  return (
    <div>
      <TyreCheckPanel />
      <ChecklistGroup title="Engine / Brake System / Fluid Check">
        <ConditionRow label="Engine Oil" fieldPrefix="chk_engine_oil" alt />
        <ConditionRow label="Brake Fluid" fieldPrefix="chk_brake_fluid" />
        <ConditionRow label="Packing Seal" fieldPrefix="chk_packing_seal" alt />
        <ConditionRow label="Brake Pad — Front" fieldPrefix="chk_brake_pad_front" />
        <ConditionRow label="Brake Pad — Rear" fieldPrefix="chk_brake_pad_rear" alt />
        <ConditionRow label="V-Belt" fieldPrefix="chk_v_belt" />
      </ChecklistGroup>

      <ChecklistGroup title="Other Components Check">
        <LampsRow alt />
        <ConditionRow label="Wiper Blades" fieldPrefix="chk_wiper_blades" />
        <ConditionRow label="Wiper Fluid" fieldPrefix="chk_wiper_fluid" alt />
        <ConditionRow label="Battery" fieldPrefix="chk_battery" />
      </ChecklistGroup>
    </div>
  );
}

function GeneralPanel() {
  return (
    <div>
      <ChecklistGroup title="Engine / Brake System / Fluid Check (Extended)">
        <ConditionRow label="Engine Oil" fieldPrefix="chk_engine_oil" alt />
        <ConditionRow label="Spark Plug" fieldPrefix="chk_spark_plug" />
        <ConditionRow label="Power Steering Fluid" fieldPrefix="chk_power_steering" alt />
        <ConditionRow label="Coolant" fieldPrefix="chk_coolant" />
        <ConditionRow label="Transmission Fluid" fieldPrefix="chk_transmission_fluid" alt />
        <ConditionRow label="Air Filter" fieldPrefix="chk_air_filter" />
        <ConditionRow label="Fuel Filter" fieldPrefix="chk_fuel_filter" alt />
      </ChecklistGroup>

      <ChecklistGroup title="Air Conditioning System Checking">
        <ConditionRow label="Compressor" fieldPrefix="chk_ac_compressor" alt />
        <ConditionRow label="Magnetic Clutch" fieldPrefix="chk_ac_magnetic_clutch" />
        <ConditionRow label="Condensor" fieldPrefix="chk_ac_condensor" alt />
        <ConditionRow label="Pipe" fieldPrefix="chk_ac_pipe" />
        <ConditionRow label="Switch" fieldPrefix="chk_ac_switch" alt />
      </ChecklistGroup>

      <ChecklistGroup title="Suspension & Brake">
        <ConditionRow label="Wheel Bearing" fieldPrefix="chk_suspension_wheel_bearing" />
        <ConditionRow label="Control Arm" fieldPrefix="chk_suspension_control_arm" alt />
        <ConditionRow label="Ball Joint" fieldPrefix="chk_suspension_ball_joint" />
        <ConditionRow label="Shock Absorber" fieldPrefix="chk_suspension_shock_absorber" alt />
      </ChecklistGroup>
    </div>
  );
}