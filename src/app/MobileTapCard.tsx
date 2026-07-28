"use client";

import { Box, Flex, Heading, Link, Stack, Text } from "@chakra-ui/react";
import { Fragment, useEffect, useState } from "react";
import { round } from "lodash";
import QRCode from "react-qr-code";
import { srmColors } from "./beerStyleColors";
import { TapWindBackground } from "./TapWindBackground";

const beerColors = srmColors;
const BRAND = "#044350";

/**
 * Mobile-first, read-only tap card for the public menu.
 * Renders the beer currently on a tap without any editing controls.
 */
const MobileTapCard = ({
  batch,
  tapNumber,
  tapNotes,
}: {
  batch: any;
  tapNumber: string;
  tapNotes?: string;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const beerColor = beerColors[round(batch?.estimatedColor, 0)] ?? BRAND;

  const fullUntappedLink = batch?.batchNotes?.match(
    /https:\/\/untappd.com\/b\/[^ ]*/g,
  )?.[0];
  const untappedBeerId = fullUntappedLink?.match(/b\/([^ ]*)/)?.[1];
  const qrCodeUrl = untappedBeerId
    ? `https://untappd.com/qr/beer/${untappedBeerId?.split("/")[1]}`
    : null;

  return (
    <Box
      position="relative"
      overflow="hidden"
      width="100%"
      borderRadius="18px"
      border="1px solid rgba(4, 67, 80, 0.12)"
      background="rgba(255, 255, 255, 0.55)"
      backdropFilter="blur(16px)"
      boxShadow="0px 12px 30px rgba(50, 50, 50, 0.14)"
      color={BRAND}
      minHeight={batch ? "200px" : "96px"}
    >
      {batch && mounted && (
        <TapWindBackground
          styleName={batch?.recipe?.style?.name}
          estimatedColor={batch?.estimatedColor}
          tapNumber={tapNumber}
        />
      )}

      {batch && (
        <Fragment>
          {/* Beer-color gradient wash rising from the bottom */}
          <Box
            position="absolute"
            left="0"
            right="0"
            bottom="0"
            height="70%"
            opacity="0.16"
            pointerEvents="none"
            backgroundImage={`linear-gradient(180deg, transparent 0%, ${beerColor} 100%)`}
          />
          {/* Solid color strip along the bottom edge */}
          <Box
            position="absolute"
            left="0"
            right="0"
            bottom="0"
            height="6px"
            backgroundColor={beerColor}
            opacity="0.6"
          />
        </Fragment>
      )}

      {/* Oversized tap-number watermark */}
      <Text
        position="absolute"
        bottom="-24px"
        right="8px"
        fontSize="150px"
        lineHeight="1"
        fontWeight="bold"
        opacity="0.12"
        pointerEvents="none"
        textShadow="0px 0px 16px currentColor"
      >
        {tapNumber}
      </Text>

      <Flex
        position="relative"
        zIndex="1"
        direction="column"
        gap="3"
        p={["5", "6"]}
      >
        <Text
          fontSize="xs"
          fontWeight="bold"
          letterSpacing="0.18em"
          textTransform="uppercase"
          opacity="0.6"
        >
          Tap {tapNumber}
        </Text>

        {!batch && (
          <Heading as="h3" fontSize="xl" opacity="0.45" fontWeight="600">
            Currently empty
          </Heading>
        )}

        {batch && (
          <Fragment>
            <Heading
              as="h3"
              className="beer-label"
              fontSize={["2xl", "3xl"]}
              lineHeight="1.1"
              borderBottom="3px solid"
              borderColor={BRAND}
              pb="2"
            >
              {batch?.recipe?.name}
            </Heading>

            <Text
              fontVariantCaps="all-small-caps"
              fontSize="xl"
              opacity="0.85"
              className="beer-data"
            >
              {batch?.recipe?.style?.name}
            </Text>

            <Flex gap="2" wrap="wrap">
              <Stat label="ABV" value={`${round(batch?.measuredAbv, 1)}%`} />
              <Stat label="IBU" value={`${round(batch?.estimatedIbu)}`} />
            </Flex>

            {batch?.bottlingDate && (
              <Text fontSize="sm" opacity="0.7">
                Kegitetty{" "}
                {new Date(batch?.bottlingDate).toLocaleDateString("en-US", {
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
            )}

            {tapNotes && (
              <Text fontSize="md" fontStyle="italic" opacity="0.85">
                {tapNotes}
              </Text>
            )}

            {qrCodeUrl && (
              <Flex align="center" gap="3" pt="1">
                <Link
                  href={qrCodeUrl}
                  background="#fff"
                  p="2"
                  borderRadius="10px"
                  boxShadow="0px 2px 8px rgba(50, 50, 50, 0.15)"
                  display="inline-flex"
                >
                  <QRCode
                    value={qrCodeUrl}
                    size={72}
                    fgColor="#044350"
                    bgColor="transparent"
                  />
                </Link>
                <Text fontSize="sm" opacity="0.7" maxWidth="140px">
                  Scan to rate & check in on Untappd
                </Text>
              </Flex>
            )}
          </Fragment>
        )}
      </Flex>
    </Box>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Flex
      direction="column"
      align="center"
      minWidth="72px"
      py="2"
      px="4"
      borderRadius="12px"
      background="rgba(4, 67, 80, 0.08)"
    >
      <Text fontSize="xl" fontWeight="bold" lineHeight="1">
        {value}
      </Text>
      <Text
        fontSize="10px"
        letterSpacing="0.15em"
        textTransform="uppercase"
        opacity="0.7"
      >
        {label}
      </Text>
    </Flex>
  );
}

export default MobileTapCard;
