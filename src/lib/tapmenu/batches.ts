// Fetching completed batches from Brewfather.
//
// Shared by the menu, the assignable-batch list and the assign endpoint, which
// all need the same set: a batch can only be put on tap if Brewfather says it
// is complete.

const BATCHES_URL =
  "https://api.brewfather.app/v2/batches?complete=True&status=Completed&limit=25";

export async function fetchCompletedBatches(): Promise<any[]> {
  const token = process.env.BREWFATHER_API_TOKEN;
  if (!token) {
    throw new Error("BREWFATHER_API_TOKEN is not configured");
  }

  const res = await fetch(BATCHES_URL, {
    headers: { authorization: `Basic ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Brewfather returned HTTP ${res.status}`);
  }

  const batches = await res.json();
  if (!Array.isArray(batches)) {
    throw new Error("Unexpected batch payload from Brewfather");
  }
  return batches;
}
