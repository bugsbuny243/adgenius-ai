import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/owner-auth";

const DASHBOARD_TABLES = {
  unityBuildJobs: "unity_build_jobs",
  profiles: "profiles",
  packagePurchases: "package_purchases",
} as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function OwnerDashboardPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const currentUser = await getCurrentUser();
    const { OWNER_USER_ID } = getOwnerEnv();

    if (!OWNER_USER_ID) {
      throw new Error("OWNER_USER_ID env değişkeni tanımlı değil.");
    }

    if (!isUuid(OWNER_USER_ID)) {
      throw new Error(`OWNER_USER_ID geçerli bir UUID değil: ${OWNER_USER_ID}`);
    }

    if (!currentUser) {
      throw new Error(
        "Supabase auth.getUser() null döndü. Oturum/cookie doğrulaması başarısız olabilir.",
      );
    }

    if (currentUser.id !== OWNER_USER_ID) {
      throw new Error(
        `Owner doğrulama hatası: currentUser.id (${currentUser.id}) OWNER_USER_ID ile eşleşmiyor.`,
      );
    }

    const [
      { data: unityBuildJobs, error: unityBuildJobsError },
      { data: profiles, error: profilesError },
      { data: packagePurchases, error: packagePurchasesError },
    ] = await Promise.all([
      supabase
        .from(DASHBOARD_TABLES.unityBuildJobs)
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from(DASHBOARD_TABLES.profiles)
        .select("id, full_name, email, active_package_name, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from(DASHBOARD_TABLES.packagePurchases)
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const purchaseUserIds = Array.from(
      new Set(
        (packagePurchases ?? []).map((row) => row.user_id).filter(Boolean),
      ),
    );
    const { data: purchaseProfiles, error: purchaseProfilesError } =
      purchaseUserIds.length
        ? await supabase
            .from(DASHBOARD_TABLES.profiles)
            .select("id, email, full_name")
            .in("id", purchaseUserIds)
        : { data: [], error: null };

    const purchaseProfileMap = new Map(
      (purchaseProfiles ?? []).map((profile) => [profile.id, profile]),
    );

    const approvePurchase = async (formData: FormData) => {
      "use server";

      try {
        const supabase = await createSupabaseServerClient();
        const purchaseId = String(formData.get("purchaseId"));

        const nowIso = new Date().toISOString();
        const { data: purchase, error: purchaseError } = await supabase
          .from(DASHBOARD_TABLES.packagePurchases)
          .select("id, user_id, package_key")
          .eq("id", purchaseId)
          .single();

        if (purchaseError) {
          console.error(
            "[OwnerDashboard][approvePurchase] Purchase lookup error",
            purchaseError,
          );
          return;
        }

        const { error } = await supabase
          .from(DASHBOARD_TABLES.packagePurchases)
          .update({ status: "approved", approved_at: nowIso })
          .eq("id", purchaseId);

        if (error) {
          console.error(
            "[OwnerDashboard][approvePurchase] Supabase update error",
            error,
          );
          return;
        }

        const { error: profileUpdateError } = await supabase
          .from(DASHBOARD_TABLES.profiles)
          .update({
            active_package_name: purchase.package_key,
          })
          .eq("id", purchase.user_id);

        if (profileUpdateError) {
          console.error(
            "[OwnerDashboard][approvePurchase] Profile update error",
            profileUpdateError,
          );
        }
      } catch (error) {
        console.error(
          "[OwnerDashboard][approvePurchase] Unexpected server action error",
          error,
        );
        throw error;
      }
    };

    return (
      <main className="p-6 space-y-8">
        <h1 className="text-3xl font-bold">Owner Dashboard</h1>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">unity_build_jobs</h2>
          {unityBuildJobsError ? (
            <p className="text-red-500">
              Veri alınamadı: {unityBuildJobsError.message}
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    {unityBuildJobs?.[0]
                      ? Object.keys(unityBuildJobs[0]).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 border-b font-medium"
                          >
                            {key}
                          </th>
                        ))
                      : null}
                  </tr>
                </thead>
                <tbody>
                  {unityBuildJobs?.map((row, i) => (
                    <tr
                      key={String(row.id ?? i)}
                      className="odd:bg-white even:bg-gray-50"
                    >
                      {Object.values(row).map((value, idx) => (
                        <td key={idx} className="px-3 py-2 border-b align-top">
                          {value === null
                            ? "-"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
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
            <p className="text-red-500">
              Veri alınamadı: {profilesError.message}
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 border-b font-medium">
                      full_name
                    </th>
                    <th className="px-3 py-2 border-b font-medium">email</th>
                    <th className="px-3 py-2 border-b font-medium">
                      active_package_name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles?.map((row, i) => (
                    <tr
                      key={String(row.id ?? i)}
                      className="odd:bg-white even:bg-gray-50"
                    >
                      <td className="px-3 py-2 border-b align-top">
                        {row.full_name ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.email ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.active_package_name ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">package_purchases</h2>
          {packagePurchasesError || purchaseProfilesError ? (
            <p className="text-red-500">
              Veri alınamadı:{" "}
              {packagePurchasesError?.message ?? purchaseProfilesError?.message}
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 border-b font-medium">
                      Müşteri Maili
                    </th>
                    <th className="px-3 py-2 border-b font-medium">
                      Paket Adı
                    </th>
                    <th className="px-3 py-2 border-b font-medium">
                      Ödenen Tutar
                    </th>
                    <th className="px-3 py-2 border-b font-medium">
                      Satın Alma Tarihi
                    </th>
                    <th className="px-3 py-2 border-b font-medium">
                      Onay Durumu
                    </th>
                    <th className="px-3 py-2 border-b font-medium">actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packagePurchases?.map((row, i) => (
                    <tr
                      key={String(row.id ?? i)}
                      className="odd:bg-white even:bg-gray-50"
                    >
                      <td className="px-3 py-2 border-b align-top">
                        {purchaseProfileMap.get(row.user_id)?.email ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.package_key ?? row.package_name ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.amount != null
                          ? `${row.amount} ${row.currency ?? ""}`.trim()
                          : "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.created_at ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b align-top">
                        {row.status ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <form action={approvePurchase}>
                          <input
                            type="hidden"
                            name="purchaseId"
                            value={String(row.id)}
                          />
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
  } catch (error) {
    console.error("[OwnerDashboardPage] Server Components render error", error);

    return (
      <main className="p-6 space-y-4">
        <h1 className="text-3xl font-bold">Owner Dashboard</h1>
        <p className="text-red-500">
          An error occurred in the Server Components render. Railway loglarını
          kontrol edin.
        </p>
      </main>
    );
  }
}
