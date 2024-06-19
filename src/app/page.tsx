import { Box, Text, Spacer, Flex, Divider } from "@chakra-ui/layout";
import TapMenuItem from "./TapMenuItem";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function Home({ searchParams }) {
  if (!token) {
    return (
      <Flex
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
      >
        <Text>Missing Brewfather API token</Text>
      </Flex>
    );
  }

  try {
    const batches = await fetch(
      "https://api.brewfather.app/v2/batches?include=[brewday,recipe,fermentations,fermentationsteps,fermentationreadings,fermentationnotes,batch]",
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
      }
    );

    const batchesData = await batches.json();
    const { tap1, tap2, tap3, tap4 } = searchParams ?? {};

    return (
      <Flex flexWrap="wrap" flexDirection="row" p="36">
        <TapMenuItem
          batches={batchesData}
          batch={batchesData?.find((batch) => batch._id === tap1)}
          tap="tap1"
        />

        <TapMenuItem
          batches={batchesData}
          batch={batchesData?.find((batch) => batch._id === tap2)}
          tap="tap2"
        />

        <TapMenuItem
          batches={batchesData}
          batch={batchesData?.find((batch) => batch._id === tap3)}
          tap="tap3"
        />

        <TapMenuItem
          batches={batchesData}
          batch={batchesData?.find((batch) => batch._id === tap4)}
          tap="tap4"
        />
      </Flex>
    );
  } catch (error) {
    console.error("ERROR", error);
  }
}
