"use client";

import { Box, Center, Flex, Heading, Span } from "@chakra-ui/react";
import { round } from "lodash";
import Image from "next/image";
import QRCode from "react-qr-code";
import { useRef } from "react";
import * as htmlToImage from "html-to-image";
// @ts-ignore
import { saveAs } from "file-saver";

const Etiquette = ({ beer }: any) => {
  const fullUntappedLink = beer?.batchNotes?.match(
    /https:\/\/untappd.com\/b\/[^ ]*/g
  )?.[0];

  const ref = useRef(null);

  console.log("BEER", beer, !beer)

  if (!beer) {  
    return <Box>
      Select a beer from the dropdown
    </Box>
  }

  return (
    <Flex
      border="1px dashed #ddd"
      onClick={() => {
        ref?.current &&
          htmlToImage.toPng(ref.current).then(function (dataUrl) {
            saveAs(dataUrl, "etiketti.png");
          });
      }}
      ref={ref}
      justifyContent="space-between"
      flexDirection="column"
      width="240px"
      alignItems="center"
      background="#fff"
      color="#044350"
      className="etiquette"
    >
      <Flex
        pt="6"
        height="240px"
        justifyContent="flex-start"
        flexDirection="column"
        width="100%"
        gap="2"
      >
        <Heading
          width="100%"
          textAlign="center"
          borderTop="1px solid #ddd"
          borderBottom="1px solid #ddd"
          py="10px"
          background="#ececec"
          color="#044350"
          fontSize="large"
        >
          {beer?.recipe?.name}
        </Heading>

        <Span px="6" fontSize="16px" textAlign="center">
          {round(beer?.measuredAbv, 1).toFixed(1)}% ABV
        </Span>

        <Span
          px="6"
          fontVariant="small-caps"
          fontSize="13px"
          textAlign="center"
        >
          {beer?.recipe?.style?.name}
        </Span>

        {fullUntappedLink && (
          <Center mt="5">
            <QRCode
              value={fullUntappedLink}
              size={52}
              fgColor="#333"
              bgColor="transparent"
            />
          </Center>
        )}

        {/* <Heading>{beer?.recipe?.style?.name}</Heading> */}
        {/* <p>{beer?.brewday?.notes}</p> */}
      </Flex>

      <Box pb="4" opacity="0.5">
        <Image src="/Panimo_Valta-logo.svg" alt="" width={210} height={100} />
      </Box>
    </Flex>
  );
};

export default Etiquette;
