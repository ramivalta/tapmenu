"use client";

import { Box, Flex, Heading, List, Span, Stack } from "@chakra-ui/react";
import { round, uniq } from "lodash";
import Image from "next/image";
import QRCode from "react-qr-code";
import { LabelVariation } from "./A4Sheet";

/**
 * Generates a procedural wavy wind pattern as an SVG path.
 * Each label gets slightly different wave parameters based on its variation.
 */
function WindBackground({ variation }: { variation: LabelVariation }) {
  const { hueShift, cosmicDots } = variation;

  // Use cosmicDots data as seeds for wave parameters
  const waves = cosmicDots.slice(0, 5).map((dot, i) => {
    const amplitude = 15 + dot.r * 12;
    const frequency = 0.005 + dot.opacity * 0.008;
    const yOffset = 60 + i * 80 + dot.y * 0.5;
    const phase = dot.x * 0.5;
    return { amplitude, frequency, yOffset, phase };
  });

  // Generate smooth wave paths
  const paths = waves.map((wave, i) => {
    let d = `M 0 ${wave.yOffset}`;
    for (let x = 0; x <= 740; x += 10) {
      const y =
        wave.yOffset +
        Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
        Math.sin(x * wave.frequency * 1.7 + wave.phase * 2) *
          (wave.amplitude * 0.4);
      d += ` L ${x} ${y}`;
    }
    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={`hsla(${195 + hueShift}, 30%, 75%, ${0.25 - i * 0.03})`}
        strokeWidth={12 + i * 4}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "740px",
        height: "443px",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {paths}
    </svg>
  );
}

export function SheetLabel({
  beer,
  variation,
  total,
}: {
  beer: any;
  variation: LabelVariation;
  total: number;
}) {
  const fullUntappedLink = beer?.batchNotes?.match(
    /https:\/\/untappd.com\/b\/[^ ]*/g,
  )?.[0];
  const untappedBeerId = fullUntappedLink?.match(/b\/([^ ]*)/)?.[1];
  const qrCodeUrl = `https://untappd.com/qr/beer/${
    untappedBeerId?.split("/")[1]
  }`;

  const hopsNames = uniq(beer?.recipe?.hops?.map((hop: any) => hop.name));

  // Scale to fit cell width: 561.5 / 940 ≈ 0.597
  const scale = 0.597;
  const labelHeight = 443;
  const rightPanelWidth = 200;

  return (
    <Box width="100%" height="100%" overflow="hidden" position="relative">
      <Box
        transform={`scale(${scale})`}
        transformOrigin="top left"
        width="940px"
        height={`${labelHeight}px`}
        position="absolute"
        top="0"
        left="0"
      >
        {/* Star overlay */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "940px",
            height: `${labelHeight}px`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {variation.stars.map((star, i) => (
            <g
              key={i}
              transform={`translate(${star.x * 9.4}, ${(star.y * labelHeight) / 100})`}
            >
              <path
                d={`M 0 ${-star.size * 3} L ${star.size * 0.8} 0 L 0 ${star.size * 3} L ${-star.size * 0.8} 0 Z`}
                fill="#044350"
                opacity={star.opacity * 0.5}
              />
              <path
                d={`M ${-star.size * 3} 0 L 0 ${star.size * 0.8} L ${star.size * 3} 0 L 0 ${-star.size * 0.8} Z`}
                fill="#044350"
                opacity={star.opacity * 0.35}
              />
            </g>
          ))}
        </svg>

        {/* The label container */}
        <Box
          position="relative"
          width="940px"
          height={`${labelHeight}px`}
          background="#fff"
          color="#044350"
          className="etiquette"
          overflow="hidden"
        >
          {/* Procedural wind/wave background — only in the white area */}
          <WindBackground variation={variation} />

          {/* Left perforation cloud — full height */}
          <Flex
            height="100%"
            background="#efefef"
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0px/50px 50px"
            position="absolute"
            left="-30px"
            zIndex="4"
            width="50px"
          />
          <Flex
            height="100%"
            background="#ccc"
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 25px/50px 50px"
            position="absolute"
            left="-23px"
            zIndex="3"
            width="50px"
          />

          {/* Right perforation cloud — full height, just before the right panel */}
          <Flex
            height="100%"
            width="50px"
            background="#efefef"
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0/50px 50px"
            position="absolute"
            right={`${rightPanelWidth - 28}px`}
            zIndex="4"
          />
          <Flex
            height="100%"
            width="50px"
            background="#ccc"
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 25px/50px 50px"
            position="absolute"
            right={`${rightPanelWidth - 23}px`}
            zIndex="3"
          />

          {/* Right panel — full height, single background, contains ingredients + QR */}
          <Flex
            position="absolute"
            top="0"
            right="0"
            bottom="0"
            width={`${rightPanelWidth}px`}
            background="#efefef"
            flexDirection="column"
            zIndex="5"
            p="6"
            pl="24px"
            fontSize="lg"
          >
            <Flex flex="1" flexDirection="column" gap="2px">
              <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                Käyvät
              </Span>
              <List.Root fontSize="13px" listStylePosition="outside">
                {beer?.recipe?.fermentables?.map((fermentable: any) => {
                  if (fermentable.name === "Rice Hulls") return null;
                  return (
                    <List.Item key={fermentable.name}>
                      {fermentable.name}
                    </List.Item>
                  );
                })}
              </List.Root>

              <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                Humalat
              </Span>
              <List.Root fontSize="13px" listStylePosition="outside">
                {hopsNames?.map((hop: any) => (
                  <List.Item key={hop}>{hop}</List.Item>
                ))}
              </List.Root>

              <Span fontWeight="bold" fontVariantCaps="all-small-caps">
                Hiiva
              </Span>
              <List.Root fontSize="13px" listStylePosition="outside">
                {beer?.recipe?.yeasts?.map((yeast: any) => (
                  <List.Item key={yeast._id}>
                    {yeast.name} {yeast.productId}
                  </List.Item>
                ))}
              </List.Root>
            </Flex>

            {/* QR code at the bottom of the right panel */}
            {fullUntappedLink && (
              <Flex justifyContent="center" alignItems="center" pt="2">
                <QRCode
                  value={qrCodeUrl}
                  size={76}
                  fgColor={variation.qrColor}
                  bgColor="transparent"
                />
              </Flex>
            )}
          </Flex>

          {/* Left section: rocket logo */}
          <Flex
            flexDirection="column"
            opacity="0.9"
            alignItems="center"
            color="#044350"
            position="absolute"
            left="72px"
            top="50%"
            transform="translateY(-50%)"
            zIndex="2"
            background="radial-gradient(ellipse, #fff 50%, transparent 70%)"
            p="20px"
          >
            <Image
              src="/rocket4.svg"
              alt=""
              width={200}
              height={80}
              color="#044350"
            />
          </Flex>

          {/* Center text content */}
          <Flex
            position="absolute"
            top="0"
            bottom="78px"
            left="calc(240px + 1rem)"
            right={`${rightPanelWidth + 24}px`}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="2"
            zIndex="2"
            pt="6"
          >
            <Heading
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

          {/* Bottom bar */}
          <Flex
            position="absolute"
            bottom="0"
            left="0"
            right={`${rightPanelWidth}px`}
            height="78px"
            alignItems="center"
            zIndex="2"
          >
            <Flex
              textAlign="center"
              fontSize="18px"
              alignItems="center"
              width="260px"
              justifyContent="center"
            >
              <Box opacity="0.8" ml="60px">
                <Image src="/textLogo.svg" alt="" width={120} height={50} />
              </Box>
            </Flex>

            <Flex
              flex="1"
              flexDirection="row"
              justifyContent="center"
              alignItems="center"
              pr="24px"
              fontSize="xl"
              gap="4"
            >
              <Span>{round(beer?.estimatedIbu)} IBU</Span>
              <Span>{"\u2022"}</Span>
              <Span>
                {beer?.bottlingDate ? (
                  <Stack gap="2">
                    Pullotettu{" "}
                    {new Date(beer?.bottlingDate).toLocaleDateString("en-US", {
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Stack>
                ) : (
                  ""
                )}
              </Span>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}
