import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { Bell } from "lucide-react";

const RINGTONES = [
  { value: "default", label: "Default (suara sistem)" },
  { value: "chime", label: "Chime — lembut" },
  { value: "bell", label: "Bell — klasik" },
  { value: "ding", label: "Ding — pendek" },
  { value: "silent", label: "Silent (tanpa suara)" },
];

export default function NotificationPrefsCard() {
  const { prefs, merged, savePrefs, loading } = useNotificationPrefs();
  const [ringtone, setRingtone] = useState<string>(prefs.ringtone ?? merged.ringtone);
  const [vibrate, setVibrate] = useState<boolean>(prefs.vibrate ?? merged.vibrate);

  useEffect(() => {
    setRingtone(prefs.ringtone ?? merged.ringtone);
    setVibrate(prefs.vibrate ?? merged.vibrate);
  }, [prefs.ringtone, prefs.vibrate, merged.ringtone, merged.vibrate]);

  const preview = () => {
    try {
      const url =
        merged.soundUrl ||
        `https://actions.google.com/sounds/v1/alarms/${
          ringtone === "chime" ? "gentle_alarm" :
          ringtone === "bell" ? "bugle_tune" :
          ringtone === "ding" ? "alarm_clock" : "beep_short"
        }.ogg`;
      const a = new Audio(url);
      a.volume = 0.5;
      a.play().catch(() => {});
    } catch {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" /> Pengaturan Notifikasi
        </CardTitle>
        <CardDescription>Atur dering dan getar untuk notifikasi push di perangkat Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Aktifkan notifikasi</Label>
            <p className="text-xs text-muted-foreground">Matikan untuk berhenti menerima push notifikasi.</p>
          </div>
          <Switch
            checked={prefs.enabled}
            disabled={loading}
            onCheckedChange={(v) => savePrefs({ enabled: v })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Dering notifikasi</Label>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={ringtone}
            onChange={(e) => {
              setRingtone(e.target.value);
              savePrefs({ ringtone: e.target.value });
            }}
          >
            {RINGTONES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={preview} className="w-fit">
            Preview suara
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Getar</Label>
            <p className="text-xs text-muted-foreground">Aktifkan getar saat notifikasi masuk.</p>
          </div>
          <Switch
            checked={vibrate}
            onCheckedChange={(v) => {
              setVibrate(v);
              savePrefs({ vibrate: v });
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Di Android, suara di layar kunci mengikuti channel sistem (Settings → Apps → Browser → Notifications). Dering custom diputar saat aplikasi terbuka.
        </p>
      </CardContent>
    </Card>
  );
}