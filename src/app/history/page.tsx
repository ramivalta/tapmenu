import BrewHistory from "./BrewHistory";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function History() {
  const batches = await fetch(
    // "https://api.brewfather.app/v2/batches?include=[brewday,recipe,batchNotes,batch.notes]&status=Completed",
    "https://api.brewfather.app/v2/batches?complete=True&status=Archived&limit=50",
    // "https://api.brewfather.app/v2/batches?complete=True",
    {
      headers: {
        Authorization: `Basic ${token}`,
      },
      next: {
        revalidate: 1,
      },
    }
  );
  const batchesData = await batches.json();

  //   console.log("HISTORY", batchesData);

  if (batchesData) {
    return <BrewHistory batches={batchesData} />;
  }

  //   console.log(batchesData);
}

// bGRVYU1nbXh2TmJFTDVrZFBUSEFrM0VUSUVmMTpsczRwdFJWY1Q1TVFBR1hIaGxLWmZjQVVxUlU4YU1LUUthR01DM0JrQ3BHUndrOUZxdEpiOUVJU0VkYzZPSGJ3
