import { Box, Text, Spacer, Flex, Divider, Center, Link } from "@chakra-ui/layout";
import TapMenuItem from "./TapMenuItem";
import { Fragment } from "react";
import Controls from "./Controls";
import Logo from "./Panimo_Valta-logo.svg";
import Image from "next/image";


const token = process.env.BREWFATHER_API_TOKEN;

export default async function Home({ searchParams }: {
  searchParams: {
    tap1: string;
    tap2: string;
    tap3: string;
    tap4: string;
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

    const batchesData = await batches.json();
    const { tap1, tap2, tap3, tap4, showHops: _showHops, showFermentables: _showFermantables } = searchParams ?? {};


    const showHops = Number(_showHops);
    const showFermentables = Number(_showFermantables);


    return (
      <Flex
        backgroundImage="/Panimo_Valta-taustatile-white.png"
        backgroundRepeat="repeat"
        minHeight="100vh"
        filter="saturate(0.1)"
        justifyContent="center"
        flexDirection="column"
      >
        <Box position="absolute" left="0" right="0" bottom="0" top="0">
          <Image src="/Panimo_Valta-taustalogo.png" alt="Panimo Valta background" layout="fill" style={{
            objectFit: "contain",
            
            
          }} />
        </Box>

        <Box position="fixed" top="0" left="0" right="0" zIndex="2" background="#ddd" opacity="0" _hover={{
          opacity: 1
        }} transition="0.35s all">
          <Center>
            <Controls showHops={showHops} showFermentables={showFermentables} />
          </Center>
        </Box>

        <Center pb="18" color="#044350"> 
          <Image src="/Panimo_Valta-logo.svg" alt="Panimo Valta logo" width={480} height={360} color="#044350" />
        </Center>

        <Center pt="12">
          <Flex flexWrap="wrap" flexDirection="row" justifyContent="center" gap="4" position="relative" p="4">

          <Flex width="23%" maxWidth="420px" minWidth="360px">

              <TapMenuItem
                batches={batchesData}
                batch={batchesData?.find((batch: any) => batch._id === tap1)}
                tap="tap1"
                showHops={showHops}
                showFermentables={showFermentables}
                tapNumber="1"
              />
            </Flex>

            <Flex>
              <Divider orientation="vertical" borderLeft="3px solid #044350" />
            </Flex>

            <Flex width="23%" maxWidth="420px" minWidth="360px">

              <TapMenuItem
                batches={batchesData}
                batch={batchesData?.find((batch: any) => batch._id === tap2)}
                tap="tap2"
                showHops={showHops}
                showFermentables={showFermentables}
                tapNumber="2"
              />

            </Flex>

            <Flex>
              <Divider orientation="vertical" borderLeft="3px solid #044350" />
            </Flex>

            <Flex width="23%" maxWidth="420px" minWidth="360px">
              <TapMenuItem
                batches={batchesData}
                batch={batchesData?.find((batch: any) => batch._id === tap3)}
                tap="tap3"
                showHops={showHops}
                showFermentables={showFermentables}
                tapNumber="3"
              />

            </Flex>
            <Flex>
              <Divider orientation="vertical" borderLeft="3px solid #044350" />
            </Flex>

            <Flex width="23%" maxWidth="420px" minWidth="360px">
              <TapMenuItem
                batches={batchesData}
                batch={batchesData?.find((batch: any) => batch._id === tap4)}
                tap="tap4"
                showHops={showHops}
                showFermentables={showFermentables}
                tapNumber="4"
              />

            </Flex>
          </Flex>

        </Center>

        {/* <pre>
          {JSON.stringify(batchesData, null, 2)}
        </pre> */}
      </Flex>
    );
  } catch (error) {
    console.error("ERROR", error);
  }
}
