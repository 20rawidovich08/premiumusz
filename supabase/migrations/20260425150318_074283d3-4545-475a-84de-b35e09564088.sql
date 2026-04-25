ALTER TABLE public.bot_users
ADD COLUMN IF NOT EXISTS wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.balance_transactions
ADD COLUMN IF NOT EXISTS bot_user_id uuid NULL REFERENCES public.bot_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_balance_transactions_bot_user_id
ON public.balance_transactions(bot_user_id);

CREATE OR REPLACE FUNCTION public.admin_decide_topup(p_tx_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_tx public.balance_transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into v_tx from public.balance_transactions where id = p_tx_id for update;
  if v_tx is null then raise exception 'Not found'; end if;
  if v_tx.status <> 'pending' then raise exception 'Already processed'; end if;
  if v_tx.type <> 'topup' then raise exception 'Not a topup'; end if;

  if p_approve then
    if v_tx.bot_user_id is not null then
      update public.bot_users set balance = balance + v_tx.amount_uzs where id = v_tx.bot_user_id;
    else
      update public.profiles set balance = balance + v_tx.amount_uzs where id = v_tx.user_id;
    end if;
    update public.balance_transactions set status = 'approved', admin_note = p_note where id = p_tx_id;
  else
    update public.balance_transactions set status = 'rejected', admin_note = p_note where id = p_tx_id;
  end if;
end;
$function$;