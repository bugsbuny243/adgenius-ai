import { Activity, DollarSign, Server, Users } from 'lucide-react';

type MultiplayerServerModuleProps = {
  activePlayers: number;
  isOnline: boolean;
};

const BASE_MONTHLY_COST_USD = 5;
const PLAYER_COST_USD = 0.12;

export function MultiplayerServerModule({ activePlayers, isOnline }: MultiplayerServerModuleProps) {
  const estimatedMonthlyCost = BASE_MONTHLY_COST_USD + activePlayers * PLAYER_COST_USD;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-zinc-900/60 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-cyan-300" />
          <h3 className="text-xl font-semibold tracking-tight text-cyan-100">Multiplayer Node Monitor</h3>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          Railway Service
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sunucu Durumu</p>
          <div className="mt-2 flex items-center gap-2">
            <Activity className={`h-4 w-4 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
            <p className={`text-lg font-semibold ${isOnline ? 'text-emerald-300' : 'text-rose-300'}`}>{isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Aktif Oyuncu Sayısı</p>
          <div className="mt-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-300" />
            <p className="text-lg font-semibold text-violet-200">{activePlayers}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-300" />
          <p className="text-sm font-semibold text-amber-200">Aylık Tahmini Sunucu Masrafı</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-amber-100">${estimatedMonthlyCost.toFixed(2)} / ay</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Hesaplama: ${BASE_MONTHLY_COST_USD.toFixed(2)} taban + oyuncu başına ${PLAYER_COST_USD.toFixed(2)}.
        </p>
      </div>
    </section>
  );
}
