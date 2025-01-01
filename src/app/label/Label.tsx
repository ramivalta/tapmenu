"use client";

import { Box, Button, Flex, Heading, List, Span } from "@chakra-ui/react";
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

  const hopsNames = uniq(beer?.recipe?.hops?.map((hop: any) => hop.name));



  return (
    <Flex overflow="auto" flexDirection="column">
      <Flex overflow="scroll">
        <Flex
          position="relative"
          border="1px dashed #333"
          ref={ref}
          justifyContent="space-between"
          flexDirection="column"
          width="940px"
          maxWidth="940px"
          minWidth="940px"
          alignItems="center"
          background="#fff"
          color="#044350"
          className="etiquette"
          overflow="hidden"
          boxSizing="content-box"
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
              <Flex
                height="600px"
                background="#efefef"
                top="0"
                mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0px/50px 50px;"
                position="absolute"
                left="-30px"
                zIndex="2"
                width="50px"
              />

              <Flex
                height="600px"
                background="#ccc"
                top="0"
                mask="radial-gradient(farthest-side,#000 98%,#0000) 0 25px/50px 50px;"
                position="absolute"
                right="0"
                zIndex="1"
                width="50px"
                left="-23px"
              />
              <Flex flex="1" />
              <Flex
                flexDirection="column"
                opacity="0.9"
                alignItems="center"
                color="#044350"
                position="absolute"
                left="72px"
              >
                <Image
                  src="/rocket4.svg"
                  // src="/rocket_green@3x.png"
                  alt=""
                  width={200}
                  height={80}
                  color="#044350"
                  key="rocket"
                />
              </Flex>

              <Flex
                ml="calc(240px + 1rem)"
                pt="6"
                height="320px"
                justifyContent="flex-start"
                flexDirection="column"
                width="100%"
                gap="2"
                pr="24px"
              >
                <Flex
                  flex="1"
                  flexDirection="column"
                  alignItems="center"
                  position="relative"
                  gap="2"
                >
                  <Heading
                    mt="12px"
                    width="100%"
                    textAlign="center"
                    py="10px"
                    color="#044350"
                    fontSize="58px"
                    lineHeight={1}
                  >
                    {beer?.recipe?.name}
                  </Heading>

                  <Span fontSize="xl">{beer?.recipe?.style?.name}</Span>

                  <Span fontSize="32px" fontWeight="bold">
                    {round(beer?.measuredAbv, 1).toFixed(1)}%
                  </Span>

                  <Span fontSize="lg" textAlign="center">
                    {beer?.tasteNotes}
                  </Span>
                </Flex>
              </Flex>

              <Flex
                height="600px"
                width="222px"
                background="#efefef"
                top="0"
                mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0/50px 50px;"
                position="absolute"
                right="0"
                zIndex="2"
              />

              <Flex
                height="600px"
                width="230px"
                background="#ccc"
                top="0"
                mask="radial-gradient(farthest-side,#000 98%,#0000) 0 25px/50px 50px;"
                position="absolute"
                right="0"
                zIndex="1"
              />

              <Flex
                flexDirection="column"
                p="6"
                minWidth="200px"
                background="#efefef"
                gap="2px"
                pl="24px"
                minHeight="100%"
                position="relative"
                zIndex="2"
                fontSize="lg"
              >
                <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                  Malts
                </Span>

                <List.Root
                  fontSize="13px"
                  // listStyle="inside"
                  listStylePosition="outside"
                >
                  {beer?.recipe?.fermentables?.map((fermentable: any) => {
                    if (fermentable.name === "Rice Hulls") {
                      return null;
                    }
                    return (
                      <List.Item key={fermentable.name}>
                        {fermentable.name}
                      </List.Item>
                    );
                  })}
                </List.Root>

                <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                  Hops
                </Span>

                <List.Root
                  fontSize="13px"
                  // listStyle="inside"
                  listStylePosition="outside"
                >
                  {hopsNames?.map((hop: any) => {
                    return <List.Item key={hop}>{hop}</List.Item>;
                  })}
                </List.Root>
                <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                  Yeast
                </Span>
                <List.Root
                  fontSize="13px"
                  // listStyle="none"
                  listStylePosition="outside"
                >
                  {beer?.batchYeasts?.map((yeast: any) => {
                    return (
                      <List.Item key={yeast._id}>
                        {yeast.name} {yeast.productId}
                      </List.Item>
                    );
                  })}
                </List.Root>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            alignItems="center"
            justifyContent="flex-start"
            width="100%"
            gap="4"
          >
            <Flex
              textAlign="center"
              pb="4"
              fontSize="18px"
              alignItems="center"
              width="260px"
            >
              <Box ml="92px" opacity="0.8">
                <Image
                  key="textLogo"
                  src="/textLogo.svg"
                  alt=""
                  width={120}
                  height={50}
                />
              </Box>
            </Flex>

            <Flex
              flex="1"
              // gap="4"
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              pr="24px"
              fontSize="xl"
            >
              <Flex
                width="428px"
                justifyContent="center"
                alignItems="center"
                gap="4"
              >
                <Span>{round(beer?.estimatedIbu)} IBU</Span>

                <Span>{"\u2022"}</Span>

                {/* <Span>{Math.round(beer?.estimatedColor * 1.97)} EBC</Span> */}

                {/* <Span>{"\u2022"}</Span> */}

                {/* {beer?.measuredOg && (
            <Fragment>
              <Span>{round(beer?.measuredOg, 3).toFixed(3)} OG</Span>
              <Span>{"\u2022"}</Span>
            </Fragment>
          )}

          {beer?.measuredFg && (
            <Fragment>
              <Span>{round(beer?.measuredFg, 3).toFixed(3)} FG</Span>
              <Span>{"\u2022"}</Span>
            </Fragment>
          )} */}

                <Span>
                  {beer?.bottlingDate
                    ? new Date(beer?.bottlingDate).toLocaleDateString("en-US", {
                        month: "2-digit",
                        year: "numeric",
                      })
                    : ""}
                </Span>
              </Flex>
            </Flex>

            <Flex
              justifyContent="flex-end"
              minHeight="100%"
              position="relative"
              zIndex="3"
            >
              <Flex
                justifyContent="center"
                py="4"
                width="200px"
                background="#eee"
                position="relative"
                px="6"
              >
                {fullUntappedLink && (
                  <Box position="absolute" bottom="24px" right="76px">
                    <QRCode
                      value={qrCodeUrl}
                      size={76}
                      fgColor="#333"
                      bgColor="transparent"
                    />
                  </Box>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Button
        mt="4"
        px="4"
        onClick={() => {
          ref?.current &&
            htmlToImage
              .toPng(ref.current, {
                includeQueryParams: true,
              })
              .then(function (dataUrl) {
                saveAs(dataUrl, "etiketti.png");
              });
        }}
      >
        Save as image
      </Button>
    </Flex>
  );
};

export default Etiquette;
