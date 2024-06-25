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
        // backgroundImage="/Panimo_Valta-taustatile.png"
        backgroundImage="/noisy-gradient.svg"
        backgroundRepeat="repeat"
        backgroundSize="cover"

        // backdropFilter="blur(12px)"
        minHeight="100vh"


        // filter="saturate(0.1)"


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
            <Controls showHops={showHops} showFermentables={showFermentables} />
          </Center>
        </Box>

        <Center pb="52px" color="#044350" backdropFilter="blur(16px)" width="100%" flex="1" pt="240px">
          <Image src="/Panimo_Valta-logo.svg" alt="Panimo Valta logo" width={480} height={360} />
        </Center>


        <Flex
          
          flex="1"
          width="100%"
          alignItems="flex-end"
          justifyContent="center" 
          
        >

          <Center
            maxHeight="300px"
            // pt="8" 
            // pb="8" 
            // backdropFilter="blur(12px)"
            boxShadow="0px 42px 72px rgba(50, 50, 50, 0.1)"
            backdropFilter="blur(16px)"
            // border="1px solid #ccc"
            minHeight="300px"
            // backgroundColor="rgba(255, 255, 255, 0.5)"
            width="100%"
            background="transparent"
            flexWrap="wrap"
            flexDirection="row"
            justifyContent="center"
            gap="4"
            position="relative"

          >
          
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
                />

              </Flex>
            
            

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
