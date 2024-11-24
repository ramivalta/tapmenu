"use client";

import {
  Box,
  Center,
  Flex,
  Heading,
  List,
  Separator,
  Span,
} from "@chakra-ui/react";
import { round, uniq } from "lodash";
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
  const untappedBeerId = fullUntappedLink?.match(/b\/([^ ]*)/)?.[1];
  const qrCodeUrl = `https://untappd.com/qr/beer/${
    untappedBeerId?.split("/")[1]
  }`;

  const ref = useRef(null);

  if (!beer) {
    return <Box>Select a beer from the dropdown</Box>;
  }

  const hopsNames = uniq(beer?.batchHops?.map((hop: any) => hop.name));

  // const yeastNames = uniq(beer?.batchYeasts?.map((yeast: any) => yeast.name));

  console.log("HOP NAMES", hopsNames);

  return (
    <Flex
      position="relative"
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
      width="720px"
      alignItems="center"
      background="#fff"
      color="#044350"
      className="etiquette"
    >
      <Flex flex="1" flexDirection="column" width="100%">
        <Flex flexDirection="row" flex="1" width="100%">
          <Flex
            pt="6"
            height="360px"
            justifyContent="flex-start"
            flexDirection="column"
            width="100%"
            gap="2"
          >
            <Flex flex="1" flexDirection="column">
              <Heading fontVariant="small-caps" textAlign="center">
                Panimo Valta
              </Heading>

              <Heading
                mt="48px"
                width="100%"
                textAlign="center"
                borderTop="1px solid #ddd"
                borderBottom="1px solid #ddd"
                py="10px"
                color="#044350"
                fontSize="3xl"
              >
                {beer?.recipe?.name}
              </Heading>
            </Flex>
          </Flex>

          <Flex
            flexDirection="column"
            p="6"
            // background="antiquewhite"
            minWidth="200px"
            gap="2"
          >
            Malts
            <List.Root fontSize="12px">
              {beer?.recipe?.fermentables?.map((fermentable: any) => {
                return (
                  <List.Item key={fermentable.name} listStyle="none" pl="1">
                    {fermentable.name}
                  </List.Item>
                );
              })}
            </List.Root>
            Hops
            <List.Root fontSize="12px">
              {hopsNames?.map((hop: any) => {
                return (
                  <List.Item key={hop} listStyle="none" pl="1">
                    {hop}
                  </List.Item>
                );
              })}
            </List.Root>
            Yeast
            <List.Root fontSize="12px">
              {beer?.batchYeasts?.map((yeast: any) => {
                return (
                  <List.Item key={yeast._id} listStyle="none" pl="1">
                    {yeast.name} {yeast.productId}
                  </List.Item>
                );
              })}
            </List.Root>
          </Flex>
        </Flex>

        {/* <Heading>{beer?.recipe?.style?.name}</Heading> */}
        {/* <p>{beer?.brewday?.notes}</p> */}
      </Flex>
      <Flex
        gap="4"
        alignItems="center"
        justifyContent="flex-start"
        width="100%"
        borderTop="1px solid #ccc"
        px="6"
      >
        <Box textAlign="center" py="4" fontSize="18px">
          <Span>{round(beer?.measuredAbv, 1).toFixed(1)}% ABV</Span>

          {" | "}

          <Span>{beer?.recipe?.style?.name}</Span>
        </Box>

        <Separator orientation="vertical" borderColor="#ccc" />

        {/* <Span
            // px="6"
            fontVariant="small-caps"
            fontSize="18px"
            textAlign="center"
            py="4"
          >
            {beer?.recipe?.style?.name}
          </Span> */}

        {/* <Separator orientation="vertical" borderColor="#044350" /> */}

        {/* <Span py="4">
            Brewed on
            <br />
            {beer?.brewDate
              ? new Date(beer?.brewDate).toLocaleDateString("fi-FI")
              : ""}
          </Span>

          <Separator orientation="vertical" borderColor="#ccc" /> */}

        <Box py="4">
          <Span>Bottled </Span>
          <Span>
            {beer?.bottlingDate
              ? new Date(beer?.bottlingDate).toLocaleDateString("en-US", {
                  month: "2-digit",
                  year: "numeric",
                })
              : ""}

            {/*             
            {beer?.bottlingDate
              ? new Date(beer?.bottlingDate).toLocaleDateString("fi-FI")
              : ""} */}
          </Span>
        </Box>

        <Separator orientation="vertical" borderColor="#ccc" />

        {fullUntappedLink && (
          <Center
            py="4"

            // border="1px solid #ccc"
          >
            <QRCode
              value={qrCodeUrl}
              size={52}
              fgColor="#333"
              bgColor="transparent"
            />
          </Center>
        )}
      </Flex>

      {/* <Box opacity="0.1" position="absolute" right="0" left="0" bottom="0"> */}
      {/* <Image src="/Panimo_Valta-logo.svg" alt="" width={520} height={240} /> */}
      {/* </Box> */}
    </Flex>
  );
};

export default Etiquette;
