"use client";

import { Box, Button, Flex } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
// @ts-ignore
import { saveAs } from "file-saver";
import { SheetLabel } from "./SheetLabel";

const LABELS_PER_SHEET = 6; // 2 columns x 3 rows, A4 landscape

// Simple seeded random number generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface LabelVariation {
  index: number;
  stars: { x: number; y: number; size: number; opacity: number }[];
  hueShift: number;
  accentHue: number;
  qrColor: string;
  cosmicDots: { x: number; y: number; r: number; opacity: number }[];
}

function generateVariation(index: number, beerName: string): LabelVariation {
  // Create a seed from the index + beer name
  const nameSeed = beerName
    ? beerName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 42;
  const rand = seededRandom(nameSeed * 1000 + index * 137);

  // Generate 3-7 stars
  const starCount = Math.floor(rand() * 5) + 3;
  const stars = Array.from({ length: starCount }, () => ({
    x: rand() * 60 + 5, // percentage, left area
    y: rand() * 40 + 5,
    size: rand() * 3 + 1.5,
    opacity: rand() * 0.4 + 0.2,
  }));

  // Subtle hue shift for background (-5 to +5 degrees)
  const hueShift = (rand() - 0.5) * 10;

  // Accent hue based on beer style (gold-ish range with variation)
  const accentHue = 35 + (rand() - 0.5) * 20;

  // QR code color variation
  const qrColors = ["#044350", "#0a2e4a", "#1a3a2a", "#2d1b4e", "#3d1f1f"];
  const qrColor = qrColors[Math.floor(rand() * qrColors.length)];

  // Cosmic dust dots
  const dotCount = Math.floor(rand() * 8) + 4;
  const cosmicDots = Array.from({ length: dotCount }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() * 2 + 0.5,
    opacity: rand() * 0.15 + 0.05,
  }));

  return { index, stars, hueShift, accentHue, qrColor, cosmicDots };
}

export default function A4Sheet({ beer }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [variations, setVariations] = useState<LabelVariation[]>([]);

  useEffect(() => {
    if (beer) {
      const beerName = beer?.recipe?.name || "beer";
      const vars = Array.from({ length: LABELS_PER_SHEET }, (_, i) =>
        generateVariation(i, beerName),
      );
      setVariations(vars);
    }
  }, [beer]);

  if (!beer) {
    return <Box>Select a beer from the dropdown</Box>;
  }

  return (
    <Flex overflow="auto" flexDirection="column" gap="4">
      <Flex overflow="scroll">
        <Flex
          ref={ref}
          // A4 landscape at 96 DPI: 1123 x 794 px
          width="1123px"
          minWidth="1123px"
          height="794px"
          background="#fff"
          className="a4-sheet"
          display="grid"
          gridTemplateColumns="1fr 1fr"
          gridTemplateRows="1fr 1fr 1fr"
          position="relative"
        >
          {variations.map((variation) => (
            <SheetLabel
              key={variation.index}
              beer={beer}
              variation={variation}
              total={LABELS_PER_SHEET}
            />
          ))}
          {/* Vertical cut line */}
          <Box
            position="absolute"
            top="0"
            bottom="0"
            left="50%"
            borderLeft="1px dashed #aaa"
            zIndex="10"
          />
          {/* Horizontal cut lines */}
          <Box
            position="absolute"
            left="0"
            right="0"
            top="33.333%"
            borderTop="1px dashed #aaa"
            zIndex="10"
          />
          <Box
            position="absolute"
            left="0"
            right="0"
            top="66.666%"
            borderTop="1px dashed #aaa"
            zIndex="10"
          />
        </Flex>
      </Flex>
      <Flex gap="4">
        <Button
          px="4"
          onClick={() => {
            ref?.current &&
              htmlToImage
                .toPng(ref.current, {
                  includeQueryParams: true,
                  pixelRatio: 3,
                })
                .then(function (dataUrl) {
                  saveAs(
                    dataUrl,
                    `etiketit-${beer?.recipe?.name || "beer"}.png`,
                  );
                });
          }}
        >
          Save A4 sheet as PNG
        </Button>
        <Button
          px="4"
          variant="outline"
          onClick={() => {
            // Regenerate with new randomness by adding timestamp
            const beerName =
              (beer?.recipe?.name || "beer") + Date.now().toString();
            const vars = Array.from({ length: LABELS_PER_SHEET }, (_, i) =>
              generateVariation(i, beerName),
            );
            setVariations(vars);
          }}
        >
          Randomize again
        </Button>
      </Flex>
    </Flex>
  );
}
