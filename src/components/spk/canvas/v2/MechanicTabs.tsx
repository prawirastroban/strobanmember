// SPK Canvas v2 — Mechanic 3-tab layout (Safety / General / Estimasi).
// Mengikuti mockup Digital SPK Stroban yang diunggah user.
import { useState } from "react";
import { ChecklistGroup } from "./ChecklistGroup";
import { ConditionRow } from "./ConditionRow";
import { LampsRow } from "./LampsRow";
import { TyreCheckPanel } from "./TyreCheckPanel";
import { EstimasiTable } from "./EstimasiTable";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";

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
      <ChecklistGroup title="Engine / Brake System / Fluid Check">
        <ConditionRow label="Spark Plug" fieldPrefix="chk_spark_plug" alt />
        <ConditionRow label="Power Steering Fluid" fieldPrefix="chk_power_steering" />
        <ConditionRow label="Transmission Fluid" fieldPrefix="chk_transmission_fluid" alt />
        <ConditionRow label="Differential Gear Oil" fieldPrefix="chk_diff_gear_oil" />
        <ConditionRow label="Brake Cylinder" fieldPrefix="chk_brake_cylinder" alt />
        <ConditionRow label="Brake Calipers" fieldPrefix="chk_brake_calipers" />
      </ChecklistGroup>

      <ChecklistGroup title="Other Components Check">
        <ConditionRow label="Alternator" fieldPrefix="chk_alternator" alt />
      </ChecklistGroup>

      <ChecklistGroup title="Air Conditioning System Checking">
        <ConditionRow label="Compressor" fieldPrefix="chk_ac_compressor" alt />
        <ConditionRow label="Magnetic Clutch" fieldPrefix="chk_ac_magnetic_clutch" />
        <ConditionRow label="Condensor" fieldPrefix="chk_ac_condensor" alt />
        <ConditionRow label="Pipe" fieldPrefix="chk_ac_pipe" />
        <ConditionRow label="Switch" fieldPrefix="chk_ac_switch" alt />
        <ConditionRow label="Compressor Oil" fieldPrefix="chk_ac_compressor_oil" />
        <ConditionRow label="Evaporator" fieldPrefix="chk_ac_evaporator" alt />
        <ConditionRow label="Motor Fan" fieldPrefix="chk_ac_motor_fan" />
        <ConditionRow label="Blower" fieldPrefix="chk_ac_blower" alt />
        <ConditionRow label="Automatic" fieldPrefix="chk_ac_automatic" />
        <ConditionRow label="Cabin Air Filter" fieldPrefix="chk_ac_cabin_air_filter" alt />
        <ConditionRow label="High Pressure" fieldPrefix="chk_ac_high_pressure" />
        <ConditionRow label="Low Pressure" fieldPrefix="chk_ac_low_pressure" alt />
        <NoteRow
          field="ac_other_remarks"
          label="Other Remarks"
          placeholder="Catatan tambahan pengecekan AC…"
        />
      </ChecklistGroup>

      <ChecklistGroup title="Suspension System Check">
        <ConditionRow label="Wheel Bearing" fieldPrefix="chk_suspension_wheel_bearing" />
        <ConditionRow label="Control Arm" fieldPrefix="chk_suspension_control_arm" alt />
        <ConditionRow label="Ball Joint" fieldPrefix="chk_suspension_ball_joint" />
        <ConditionRow label="Shock Absorber" fieldPrefix="chk_suspension_shock_absorber" alt />
        <NoteRow
          field="suspension_part_replacement"
          label="Part Replacement"
          placeholder="Part yang perlu diganti (nama, jumlah, catatan)…"
        />
      </ChecklistGroup>
    </div>
  );
}

function NoteRow({
  field,
  label,
  placeholder,
}: {
  field: string;
  label: string;
  placeholder?: string;
}) {
  const [value, setValue] = useBinding<string>(field, "");
  return (
    <div className="flex flex-col p-3 gap-2 bg-white/[0.03]">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full min-h-[64px] rounded-lg border border-white/10 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors resize-y"
      />
    </div>
  );
}