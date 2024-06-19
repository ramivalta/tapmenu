import { Box, Text, Spacer, Flex, Divider, Center } from "@chakra-ui/layout";
import TapMenuItem from "./TapMenuItem";
import { Fragment } from "react";
import Controls from "./Controls";

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

        <a href="https://docs.brewfather.app/api#authentication">
          <Text>Get your API token here and put in BREWFATHER_API_TOKEN env variable to use this thing</Text>
        </a>

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
    const { tap1, tap2, tap3, tap4, showHops: _showHops, showFermentables: _showFermantables } = searchParams ?? {};


    const showHops = Number(_showHops);
    const showFermentables = Number(_showFermantables);

    console.log("DEARCH PARAMS", searchParams);



    return (
      <Fragment>

        <Box position="fixed" top="0" left="0" right="0" zIndex="2" background="#ddd">
          <Center>


            <Controls showHops={showHops} showFermentables={showFermentables} />

          </Center>
        </Box>

        <Flex flexWrap="wrap" flexDirection="row" p="8">
          <TapMenuItem
            batches={batchesData}
            batch={batchesData?.find((batch) => batch._id === tap1)}
            tap="tap1"
            showHops={showHops}
            showFermentables={showFermentables}
          />

          <TapMenuItem
            batches={batchesData}
            batch={batchesData?.find((batch) => batch._id === tap2)}
            tap="tap2"
            showHops={showHops}
            showFermentables={showFermentables}
          />

          <TapMenuItem
            batches={batchesData}
            batch={batchesData?.find((batch) => batch._id === tap3)}
            tap="tap3"
            showHops={showHops}
            showFermentables={showFermentables}
          />

          <TapMenuItem
            batches={batchesData}
            batch={batchesData?.find((batch) => batch._id === tap4)}
            tap="tap4"
            showHops={showHops}
            showFermentables={showFermentables}
          />
        </Flex>
      </Fragment>
    );
  } catch (error) {
    console.error("ERROR", error);
  }
}
