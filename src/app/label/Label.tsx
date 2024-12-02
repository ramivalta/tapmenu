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
import { Fragment, useRef } from "react";
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
      width="920px"
      maxWidth="920px"
      minWidth="920px"
      alignItems="center"
      background="#fff"
      color="#044350"
      className="etiquette"
    >
      <Flex flex="1" flexDirection="column" width="100%">
        <Flex
          flexDirection="row"
          flex="1"
          width="100%"
          gap="4"
          alignItems="center"
          position="relative"
        >
          <Flex flex="1" />
          <Flex
            flexDirection="column"
            opacity="0.8"
            alignItems="center"
            color="#044350"
            position="absolute"
            left="0"
          >
            <Image
              src="/rocket.svg"
              alt=""
              width={260}
              height={80}
              color="#044350"
            />
          </Flex>

          <Flex
            ml="240px"
            pt="6"
            height="360px"
            justifyContent="flex-start"
            flexDirection="column"
            width="100%"
            gap="2"
          >
            <Flex
              flex="1"
              flexDirection="column"
              alignItems="center"
              position="relative"
              gap="2"
            >
              <Heading
                mt="36px"
                width="100%"
                textAlign="center"
                py="10px"
                color="#044350"
                fontSize="58px"
                lineHeight={1}
              >
                {beer?.recipe?.name}
              </Heading>

              <Span>{beer?.recipe?.style?.name}</Span>

              <Span fontSize="28px" fontWeight="bold">
                {round(beer?.measuredAbv, 1).toFixed(1)}%
              </Span>

              {/* <Flex
                flex="1"
                flexDirection="column"
                gap="2"
                justifyContent="flex-end"
              >
                
              </Flex> */}
            </Flex>
          </Flex>

          <Flex
            flexDirection="column"
            p="6"
            minWidth="200px"
            gap="2px"
            pl="24px"
            borderLeft="1px solid #ccc"
            minHeight="100%"
          >
            <Span fontWeight="bold" fontVariantCaps="all-small-caps">
              Malts
            </Span>

            <List.Root fontSize="12px" listStyle="none">
              {beer?.recipe?.fermentables?.map((fermentable: any) => {
                if (fermentable.name === "Rice Hulls") {
                  return null;
                }
                return (
                  <List.Item key={fermentable.name} pl="1">
                    {fermentable.name}
                  </List.Item>
                );
              })}
            </List.Root>
            <Span fontWeight="bold" fontVariantCaps="all-small-caps">
              Hops
            </Span>
            <List.Root fontSize="12px" listStyle="none">
              {hopsNames?.map((hop: any) => {
                return (
                  <List.Item key={hop} pl="1">
                    {hop}
                  </List.Item>
                );
              })}
            </List.Root>
            <Span fontWeight="bold" fontVariantCaps="all-small-caps">
              Yeast
            </Span>
            <List.Root fontSize="12px" listStyle="none">
              {beer?.batchYeasts?.map((yeast: any) => {
                return (
                  <List.Item key={yeast._id} pl="1">
                    {yeast.name} {yeast.productId}
                  </List.Item>
                );
              })}
            </List.Root>

            {/* <Separator orientation="horizontal" borderColor="#ccc" mt="24px" /> */}

            {/* <Separator orientation="horizontal" borderColor="#ccc" mt="24px" /> */}
          </Flex>
        </Flex>
      </Flex>
      <Flex
        // gap="2"
        alignItems="center"
        justifyContent="flex-start"
        width="100%"
        // px="6"
      >
        <Flex
          textAlign="center"
          pb="4"
          fontSize="18px"
          // gap="16px"
          alignItems="center"
          width="260px"
        >
          <Box ml="64px" opacity="0.8">
            <Image src="/textLogo.svg" alt="" width={120} height={50} />
          </Box>
        </Flex>

        <Flex
          flex="1"
          fontSize="16px"
          // mt="24px"
          // listStyle="none"
          gap="4"
          flexDirection="row"
          justifyContent="center"
          alignItems="center"
        >
          <Span>{round(beer?.estimatedIbu)} IBU</Span>

          <Span>{"\u2022"}</Span>

          <Span>{Math.round(beer?.estimatedColor * 1.97)} EBC</Span>

          <Span>{"\u2022"}</Span>

          <Span>
            {beer?.bottlingDate
              ? new Date(beer?.bottlingDate).toLocaleDateString("en-US", {
                  month: "2-digit",
                  year: "numeric",
                })
              : ""}
          </Span>
        </Flex>

        <Flex justifyContent="flex-end" minHeight="100%">
          <Flex
            justifyContent="center"
            py="4"
            width="200px"
            borderLeft="1px solid #ccc"
            px="6"
          >
            {fullUntappedLink && (
              <QRCode
                value={qrCodeUrl}
                size={52}
                fgColor="#333"
                bgColor="transparent"
              />
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Etiquette;
