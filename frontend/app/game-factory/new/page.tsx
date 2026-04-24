import { Nav } from '@/components/nav';
import { createGameProjectAction } from '@/app/game-factory/actions';

export default function NewGameFactoryPage() {
  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <h1 className="text-3xl font-bold">Yeni oyun oluştur</h1>
        <form action={createGameProjectAction} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">Game name</span>
            <input name="name" required className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Game type</span>
            <select name="game_type" className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
              <option value="runner_2d">runner_2d</option>
              <option value="puzzle">puzzle</option>
              <option value="idle_clicker">idle_clicker</option>
              <option value="arcade">arcade</option>
              <option value="platformer">platformer</option>
              <option value="custom">custom</option>
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm">Package name</span>
            <input name="package_name" placeholder="com.koschei.generated.ornek" className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm">Prompt</span>
            <textarea name="prompt" required rows={5} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Target platform</span>
            <input value="Android" readOnly className="w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2" />
          </label>

          <div className="flex items-end">
            <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
              Oluştur
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
