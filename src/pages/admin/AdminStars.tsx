import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Plus, Trash2 } from "lucide-react";
import { useAdminT } from "@/lib/adminI18n";

const AdminStars = () => {
  const t = useAdminT();
  const [packages, setPackages] = useState<any[]>([]);
  const [rate, setRate] = useState<number>(220);
  const [minStars, setMinStars] = useState<number>(50);
  const [newStars, setNewStars] = useState<number>(50);

  const load = async () => {
    const [{ data: pks }, { data: s }] = await Promise.all([
      supabase.from("stars_packages").select("*").order("stars"),
      supabase.from("settings").select("key,value").in("key", ["stars_rate_uzs", "min_stars"]),
    ]);
    setPackages((pks as any[]) ?? []);
    const map = Object.fromEntries((s ?? []).map((r: any) => [r.key, r.value]));
    if (map.stars_rate_uzs) setRate(Number(map.stars_rate_uzs));
    if (map.min_stars) setMinStars(Number(map.min_stars));
  };

  useEffect(() => { load(); }, []);

  const saveSetting = async (key: string, value: any) => {
    const { error } = await supabase.from("settings").upsert({ key, value });
    if (error) return toast.error(error.message);
    toast.success(t("saved"));
  };

  const addPackage = async () => {
    if (newStars < minStars) return toast.error(`Min ${minStars} stars`);
    const { error } = await supabase.from("stars_packages").insert({ stars: newStars, sort_order: newStars });
    if (error) return toast.error(error.message);
    setNewStars(50);
    load();
  };

  const togglePkg = async (id: string, active: boolean) => {
    await supabase.from("stars_packages").update({ active: !active }).eq("id", id);
    load();
  };

  const deletePkg = async (id: string) => {
    await supabase.from("stars_packages").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold flex items-center gap-2">
        <Star className="h-7 w-7 fill-warning text-warning" /> Stars
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-semibold">{t("settings")}</h3>
          <div>
            <Label>1 ⭐ = ? UZS</Label>
            <div className="mt-1.5 flex gap-2">
              <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
              <Button onClick={() => saveSetting("stars_rate_uzs", rate)}>{t("saved")}</Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Joriy: <b>{rate} UZS</b>. Bu narx o'zgartirilsa barcha paketlar saytda darhol yangilanadi.
            </p>
          </div>
          <div>
            <Label>Minimum stars</Label>
            <div className="mt-1.5 flex gap-2">
              <Input type="number" value={minStars} onChange={(e) => setMinStars(Number(e.target.value))} />
              <Button onClick={() => saveSetting("min_stars", minStars)}>{t("saved")}</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-semibold">{t("addPackage")}</h3>
          <div className="flex gap-2">
            <Input type="number" min={minStars} step={50} value={newStars} onChange={(e) => setNewStars(Number(e.target.value))} />
            <Button onClick={addPackage}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Narxi avtomatik: {newStars} × {rate} = {(newStars * rate).toLocaleString("ru-RU")} UZS</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl glass">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Stars</th>
              <th className="p-3">{t("priceUzs")}</th>
              <th className="p-3">{t("status")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id} className="border-t border-border/40">
                <td className="p-3 font-medium flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {p.stars}
                </td>
                <td className="p-3">{(p.stars * rate).toLocaleString("ru-RU")} UZS</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? t("active") : t("disable")}
                  </span>
                </td>
                <td className="p-3 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => togglePkg(p.id, p.active)}>
                    {p.active ? t("disable") : t("enable")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deletePkg(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {packages.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t("noOrders")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStars;
