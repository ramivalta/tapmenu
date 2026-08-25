import {
  Box,
  Text,
  Flex,
  Center,
  Link as ChakraLink,
  Stack,
  Heading,
} from "@chakra-ui/react";

import { Button } from "@/components/ui/button";

import MobileTapCard from "./MobileTapCard";
import { MainRocketLogo } from "./RocketLogo";
import { Fragment } from "react";
import Link from "next/link";

import { readSavedTapConfig } from "@/lib/tapmenu/config";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function Home() {
  if (!token) {
    return (
      <Flex
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
      >
        <Text>Missing Brewfather API token</Text>

        <Text>
          Get your{" "}
          <ChakraLink
            textDecor="underline"
            href="https://docs.brewfather.app/api#authentication"
          >
            API token here
          </ChakraLink>{" "}
          and put in BREWFATHER_API_TOKEN env variable to use this thing
        </Text>
      </Flex>
    );
  }

  try {
    const batches = await fetch(
      "https://api.brewfather.app/v2/batches?complete=True&status=Completed&limit=25",
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
        next: {
          revalidate: 1,
        },
      },
    );

    const { config: savedTapConfigJson, updatedAt: savedTapConfigUpdatedAt } =
      await readSavedTapConfig();

    const batchesData = await batches.json();

    // The public menu reflects whatever the taproom last saved as the
    // default tap config — no URL controls, no editing.
    const tapNumbers = ["1", "2", "3", "4"];
    const taps = tapNumbers.map((n) => {
      const batchId = savedTapConfigJson[`tap${n}`];
      return {
        tapNumber: n,
        batch: batchId
          ? batchesData?.find((batch: any) => batch._id === batchId)
          : undefined,
        notes: savedTapConfigJson[`tap${n}Notes`],
      };
    });

    return (
      <Fragment>
        <Center
          color="#044350"
          width="100%"
          pt={["40px", "80px"]}
          pb="4"
          px="4"
          position="relative"
          zIndex="2"
          overflow="hidden"
        >
          <Box transform={["scale(0.7)", "scale(1)"]} transformOrigin="center">
            <MainRocketLogo />
          </Box>
        </Center>

        <Heading
          as="h1"
          fontFamily="Open Sans"
          textAlign="center"
          fontSize={["3xl", "4xl"]}
          color="#044350"
          pb="6"
          px="4"
        >
          Taproom menu
        </Heading>

        <Flex justifyContent="center" width="100%" px={["4", "6"]} pb="10">
          <Stack gap="5" width="100%" maxWidth="560px">
            {taps.map((tap) => (
              <MobileTapCard
                key={tap.tapNumber}
                batch={tap.batch}
                tapNumber={tap.tapNumber}
                tapNotes={tap.notes}
              />
            ))}
          </Stack>
        </Flex>

        <Flex minHeight="160px" width="100%">
          <Center width="100%" flexDirection="column" gap="2">
            <Text fontSize="xs" color="gray.500">
              Updated{" "}
              {savedTapConfigUpdatedAt &&
                new Date(savedTapConfigUpdatedAt).toLocaleDateString("fi-FI")}
            </Text>

            <Link href="/history">
              <Button size="xs" colorPalette="cyan" as="span" px="4">
                See archived batches
              </Button>
            </Link>
          </Center>
        </Flex>
      </Fragment>
    );
  } catch (error) {
    console.error("ERROR", error);
  }
}
