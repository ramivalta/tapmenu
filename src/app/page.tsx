import { Box, Text, Flex, Divider, Center, Link, Stack, Heading } from "@chakra-ui/layout";
import TapMenuItem from "./TapMenuItem";
import Controls from "./Controls";
import Image from "next/image";




const token = process.env.BREWFATHER_API_TOKEN;

export default async function Home({ searchParams }: {
  searchParams: {
    tap1: string;
    tap2: string;
    tap3: string;
    tap4: string;
    tap1Notes?: string;
    tap2Notes?: string;
    tap3Notes?: string;
    tap4Notes?: string;
    showHops: string;
    showFermentables: string;
  };

}) {
  if (!token) {
    return (
      <Flex
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
      >
        <Text>Missing Brewfather API token</Text>

        <Text>Get your <Link textDecor="underline" href="https://docs.brewfather.app/api#authentication">
          API token here
        </Link > and put in BREWFATHER_API_TOKEN env variable to use this thing</Text>
      </Flex>
    );
  }

  try {
    const batches = await fetch(
      "https://api.brewfather.app/v2/batches?include=[brewday,recipe,batchNotes,batch.notes]&status=Completed",
      // "https://api.brewfather.app/v2/batches?complete=True",
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
        next: {
          revalidate: 1,
        }
      }
    );

    let savedTapConfig;

    try {
      savedTapConfig = require("/tmp/defaultTapConfig.json");
    } catch (err) {
      savedTapConfig = {};
    }


    const batchesData = await batches.json();

    
    const { tap1, tap2, tap3, tap4, tap1Notes, tap2Notes, tap3Notes, tap4Notes, showHops: _showHops, showFermentables: _showFermantables } = searchParams ?? {};



    const showHops = Number(_showHops);
    const showFermentables = Number(_showFermantables);

    const taps = [
      tap1,
      tap2,
      tap3,
      tap4
    ]


    return (
      <Flex
        backgroundImage="/noisy-gradient.svg"
        backgroundRepeat="repeat"
        backgroundSize="cover"
        minHeight="100vh"
        justifyContent="center"
        flexDirection="column"
      >
        <Box position="absolute" left="280px" right="280px" bottom="0" top="0">
          <Image src="/Panimo_Valta-taustalogo.png" alt="Panimo Valta background" layout="fill" style={{
            objectFit: "cover",
            objectPosition: "bottom"
          }} />
        </Box>

        <Box position="fixed" top="0" left="0" right="0" zIndex="2" background="#ddd" opacity="0" _hover={{
          opacity: 1
        }} transition="0.35s all">
          <Center>
            <Controls showHops={showHops} showFermentables={showFermentables} savedTapConfig={savedTapConfig} />
          </Center>
        </Box>

        <Center
          pb="52px"
          color="#044350"
          backdropFilter="blur(16px)"
          width="100%"
          flex="1"
          pt="160px"
        >
          <Link href="/">
            <Image src="/Panimo_Valta-logo.svg" alt="Panimo Valta logo" width={480} height={360} />
          </Link>
        </Center>

        <Heading
          as="h1"
          fontFamily="Open Sans"
          alignItems="center"
          textAlign="center"
          fontSize="3xl"
          color="#044350"
          backdropFilter="blur(16px)"
          py="4"
        >
          Taproom menu
        </Heading>

        <Flex
          flex="1"
          width="100%"
          alignItems="flex-end"
          justifyContent="center"
        >
          <Center
            borderTop="1px solid #ccc"
            borderBottom="1px solid #ccc"
            boxShadow="0px 42px 72px rgba(50, 50, 50, 0.1)"
            backdropFilter="blur(16px)"
            width="100%"
            background="rgba(255, 255, 255, 0.2)"
            justifyContent="center"
            position="relative"
          >
            <Stack gap="4" direction="row" flexWrap="wrap" justifyContent="center">
              <Flex width="23%" maxWidth="420px" minWidth="360px">
                <TapMenuItem
                  batches={batchesData}
                  batch={batchesData?.find((batch: any) => batch._id === tap1)}
                  tap="tap1"
                  showHops={showHops}
                  showFermentables={showFermentables}
                  tapNumber="1"
                  taps={taps}
                  tapNotes={tap1Notes}
                />
              </Flex>

              <Flex opacity="0.2">
                <Divider orientation="vertical" borderLeft="2px solid #044350" />
              </Flex>

              <Flex width="23%" maxWidth="420px" minWidth="360px">
                <TapMenuItem
                  batches={batchesData}
                  batch={batchesData?.find((batch: any) => batch._id === tap2)}
                  tap="tap2"
                  showHops={showHops}
                  showFermentables={showFermentables}
                  tapNumber="2"
                  taps={taps}
                  tapNotes={tap2Notes}
                />

              </Flex>

              <Flex opacity="0.2">
                <Divider orientation="vertical" borderLeft="2px solid #044350" />
              </Flex>

              <Flex width="23%" maxWidth="420px" minWidth="360px">
                <TapMenuItem
                  batches={batchesData}
                  batch={batchesData?.find((batch: any) => batch._id === tap3)}
                  tap="tap3"
                  showHops={showHops}
                  showFermentables={showFermentables}
                  tapNumber="3"
                  taps={taps}
                  tapNotes={tap3Notes}
                />

              </Flex>

              <Flex opacity="0.2">
                <Divider orientation="vertical" borderLeft="2px solid #044350" />
              </Flex>

              <Flex width="23%" maxWidth="420px" minWidth="360px">
                <TapMenuItem
                  batches={batchesData}
                  batch={batchesData?.find((batch: any) => batch._id === tap4)}
                  tap="tap4"
                  showHops={showHops}
                  showFermentables={showFermentables}
                  tapNumber="4"
                  taps={taps}
                  tapNotes={tap4Notes}
                />

              </Flex>
            </Stack>


          </Center>
        </Flex>

        <Flex minHeight="240px">

        </Flex>


        {/* <pre>
          {JSON.stringify(batchesData, null, 2)}
        </pre> */}
      </Flex>
    );
  } catch (error) {
    console.error("ERROR", error);
  }
}
