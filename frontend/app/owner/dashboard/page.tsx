import { createClient } from "@/utils/supabase/server";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();

  const [{ data: unityBuildJobs, error: unityBuildJobsError }, { data: profiles, error: profilesError }, { data: packagePurchases, error: packagePurchasesError }] =
    await Promise.all([
      supabase.from("unity_build_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("package_purchases").select("*").order("created_at", { ascending: false }),
    ]);

  const approvePurchase = async (formData: FormData) => {
    "use server";

    const supabase = await createClient();
    const purchaseId = String(formData.get("purchaseId"));

    await supabase
      .from("package_purchases")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", purchaseId);
  };

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Owner Dashboard</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">unity_build_jobs</h2>
        {unityBuildJobsError ? (
          <p className="text-red-500">Veri alınamadı: {unityBuildJobsError.message}</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {unityBuildJobs?.[0]
                    ? Object.keys(unityBuildJobs[0]).map((key) => (
                        <th key={key} className="px-3 py-2 border-b font-medium">
                          {key}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody>
                {unityBuildJobs?.map((row, i) => (
                  <tr key={String(row.id ?? i)} className="odd:bg-white even:bg-gray-50">
                    {Object.values(row).map((value, idx) => (
                      <td key={idx} className="px-3 py-2 border-b align-top">
                        {value === null ? "-" : typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">profiles</h2>
        {profilesError ? (
          <p className="text-red-500">Veri alınamadı: {profilesError.message}</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {profiles?.[0]
                    ? Object.keys(profiles[0]).map((key) => (
                        <th key={key} className="px-3 py-2 border-b font-medium">
                          {key}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody>
                {profiles?.map((row, i) => (
                  <tr key={String(row.id ?? i)} className="odd:bg-white even:bg-gray-50">
                    {Object.values(row).map((value, idx) => (
                      <td key={idx} className="px-3 py-2 border-b align-top">
                        {value === null ? "-" : typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">package_purchases</h2>
        {packagePurchasesError ? (
          <p className="text-red-500">Veri alınamadı: {packagePurchasesError.message}</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {packagePurchases?.[0]
                    ? Object.keys(packagePurchases[0]).map((key) => (
                        <th key={key} className="px-3 py-2 border-b font-medium">
                          {key}
                        </th>
                      ))
                    : null}
                  <th className="px-3 py-2 border-b font-medium">actions</th>
                </tr>
              </thead>
              <tbody>
                {packagePurchases?.map((row, i) => (
                  <tr key={String(row.id ?? i)} className="odd:bg-white even:bg-gray-50">
                    {Object.values(row).map((value, idx) => (
                      <td key={idx} className="px-3 py-2 border-b align-top">
                        {value === null ? "-" : typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b">
                      <form action={approvePurchase}>
                        <input type="hidden" name="purchaseId" value={String(row.id)} />
                        <button
                          type="submit"
                          className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                          disabled={row.status === "approved"}
                        >
                          {row.status === "approved" ? "Onaylandı" : "Onayla"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
