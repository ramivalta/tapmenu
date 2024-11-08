import { Box } from "@chakra-ui/react";
import BrewHistory from "./BrewHistory";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function History() {
  try {

    const batches = await fetch(
      // "https://api.brewfather.app/v2/batches?include=[brewday,recipe,batchNotes,batch.notes]&status=Completed",
      // "https://api.brewfather.app/v2/batches?complete=True",
      "https://api.brewfather.app/v2/batches?complete=True&status=Archived&limit=50",
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
  
    if (batchesData) {
      return <BrewHistory batches={batchesData} />;
    }
  } catch (e: any) {
    console.error(e);
    return <Box>Error fetching data</Box>;
  }
}
