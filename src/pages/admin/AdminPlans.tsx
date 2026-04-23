import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("duration_months");
    setPlans((data as any[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("plans").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Plans</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl glass p-5">
            <div className="font-display text-xl font-bold">{p.duration_months} months</div>
            <div className="mt-4 space-y-3">
              <div>
                <Label>Price (UZS)</Label>
                <Input
                  type="number"
                  defaultValue={p.price_uzs}
                  onBlur={(e) => update(p.id, { price_uzs: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Price (Stars)</Label>
                <Input
                  type="number"
                  defaultValue={p.price_stars}
                  onBlur={(e) => update(p.id, { price_stars: Number(e.target.value) })}
                />
              </div>
              <Button
                size="sm"
                variant={p.active ? "outline" : "default"}
                onClick={() => update(p.id, { active: !p.active })}
              >
                {p.active ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Changes are saved when you tab out of a field.</p>
    </div>
  );
};

export default AdminPlans;
