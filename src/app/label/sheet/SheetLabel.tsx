"use client";

import { Box, Flex, Heading, List, Span, Stack } from "@chakra-ui/react";
import { round, uniq } from "lodash";
import Image from "next/image";
import QRCode from "react-qr-code";
import { LabelVariation } from "./A4Sheet";
import { RocketLogo } from "./RocketLogo";

/**
 * SRM color lookup — maps SRM value to hex color.
 */
const srmColors = [
  "#FFE699",
  "#FFD878",
  "#FFCA5A",
  "#FFBF42",
  "#FBB123",
  "#F8A600",
  "#F39C00",
  "#EA8F00",
  "#E58500",
  "#DE7C00",
  "#D77200",
  "#CF6900",
  "#CB6200",
  "#C35900",
  "#BB5100",
  "#B54C00",
  "#B04500",
  "#A63E00",
  "#A13700",
  "#9B3200",
  "#952D00",
  "#8E2900",
  "#882300",
  "#821E00",
  "#7B1A00",
  "#771900",
  "#701400",
  "#6A0E00",
  "#660D00",
  "#5E0B00",
  "#5A0A02",
  "#600903",
  "#520907",
  "#4C0505",
  "#470606",
  "#440607",
  "#3F0708",
  "#3B0607",
  "#3A070B",
  "#36080A",
];

/**
 * Converts a hex color to HSL values.
 */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Maps beer style name to a wave color palette.
 * Returns [hue, saturation, lightness] for the wave strokes.
 */
function getStyleColor(styleName: string): [number, number, number] {
  const s = (styleName || "").toLowerCase();

  if (
    s.includes("belgian") ||
    s.includes("abbey") ||
    s.includes("trappist") ||
    s.includes("dubbel") ||
    s.includes("tripel") ||
    s.includes("quad")
  ) {
    return [38, 45, 72];
  }
  if (s.includes("ipa") || s.includes("pale ale") || s.includes("india")) {
    return [95, 35, 72];
  }
  if (s.includes("stout") || s.includes("porter") || s.includes("black")) {
    return [15, 30, 65];
  }
  if (
    s.includes("wheat") ||
    s.includes("wit") ||
    s.includes("weizen") ||
    s.includes("weiss")
  ) {
    return [45, 40, 78];
  }
  if (
    s.includes("lager") ||
    s.includes("pilsner") ||
    s.includes("pils") ||
    s.includes("helles")
  ) {
    return [200, 35, 78];
  }
  if (
    s.includes("sour") ||
    s.includes("wild") ||
    s.includes("lambic") ||
    s.includes("gose") ||
    s.includes("berliner")
  ) {
    return [330, 35, 75];
  }
  if (
    s.includes("red") ||
    s.includes("amber") ||
    s.includes("scottish") ||
    s.includes("scotch") ||
    s.includes("wee heavy") ||
    s.includes("irish")
  ) {
    return [20, 40, 70];
  }
  if (s.includes("saison") || s.includes("farmhouse")) {
    return [50, 35, 75];
  }
  return [195, 30, 75];
}

/**
 * Blends the style-based color with the actual SRM color of the beer.
 * Style provides the base character, SRM shifts the hue/warmth toward
 * the beer's actual color.
 */
function getWaveColor(
  styleName: string,
  estimatedColor: number | undefined,
): [number, number, number] {
  const [styleHue, styleSat, styleLight] = getStyleColor(styleName);

  if (estimatedColor == null || estimatedColor < 0) {
    return [styleHue, styleSat, styleLight];
  }

  const srm = Math.min(Math.round(estimatedColor), srmColors.length - 1);
  const srmHex = srmColors[srm];
  const [srmHue, srmSat] = hexToHsl(srmHex);

  // Blend: 60% style character, 40% actual beer color (hue and saturation)
  // Keep lightness from style so waves stay subtle
  const blendedHue = Math.round(styleHue * 0.6 + srmHue * 0.4);
  const blendedSat = Math.round(styleSat * 0.6 + Math.min(srmSat, 50) * 0.4);

  return [blendedHue, blendedSat, styleLight];
}

/**
 * Generates a procedural wavy wind pattern as an SVG path.
 * Each label gets slightly different wave parameters based on its variation.
 * Wave color is derived from the beer style + SRM color.
 */
function WindBackground({
  variation,
  styleName,
  estimatedColor,
}: {
  variation: LabelVariation;
  styleName: string;
  estimatedColor: number | undefined;
}) {
  const { hueShift, cosmicDots } = variation;
  const [baseHue, baseSat, baseLightness] = getWaveColor(
    styleName,
    estimatedColor,
  );

  // Use cosmicDots data as seeds for wave parameters
  const waves = cosmicDots.slice(0, 5).map((dot, i) => {
    const amplitude = 15 + dot.r * 12;
    const frequency = 0.005 + dot.opacity * 0.008;
    const yOffset = 60 + i * 80 + dot.y * 0.5;
    const phase = dot.x * 0.5;
    return { amplitude, frequency, yOffset, phase };
  });

  // Generate smooth wave paths with style-based color
  // Each wave is a filled shape that varies in thickness along its length
  const paths = waves.map((wave, i) => {
    const points = [];
    for (let x = 0; x <= 740; x += 5) {
      const baseY =
        wave.yOffset +
        Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
        Math.sin(x * wave.frequency * 1.7 + wave.phase * 2) *
          (wave.amplitude * 0.4);
      // Thickness varies along the wave — thinner at start, wider in middle, thinner at end
      const t = x / 740;
      const thickness =
        (9 + i * 4) * (0.4 + Math.sin(t * Math.PI + wave.phase) * 0.6);
      points.push({ x, baseY, thickness });
    }

    // Build a closed shape: top edge forward, bottom edge backward
    let d = `M ${points[0].x} ${points[0].baseY - points[0].thickness}`;
    for (let j = 1; j < points.length; j++) {
      d += ` L ${points[j].x} ${points[j].baseY - points[j].thickness}`;
    }
    for (let j = points.length - 1; j >= 0; j--) {
      d += ` L ${points[j].x} ${points[j].baseY + points[j].thickness}`;
    }
    d += " Z";

    return (
      <path
        key={`wave-${i}`}
        d={d}
        fill={`hsla(${baseHue + hueShift}, ${baseSat}%, ${baseLightness}%, ${0.2 - i * 0.025})`}
        stroke="none"
      />
    );
  });

  // Paper grain dots — using a better hash for uniform distribution
  const grainDots = Array.from({ length: 600 }, (_, i) => {
    // Mulberry32 hash — much better distribution than LCG
    const hash = (seed: number) => {
      let t = (seed + 0x6d2b79f5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const base = variation.index * 7919 + i;
    const x = hash(base);
    const y = hash(base + 100003);
    const size = hash(base + 200003);
    return (
      <circle
        key={`grain-${i}`}
        cx={x * 740}
        cy={y * 443}
        r={0.6 + size * 1.2}
        fill="#000"
        opacity={0.08 + size * 0.08}
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
      {/* Grain first, then waves paint over them */}
      {grainDots}
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

  // Compute wave color to tint the panel/perforations
  const [waveHue, waveSat] = getWaveColor(
    beer?.recipe?.style?.name || "",
    beer?.estimatedColor,
  );
  // Light tinted panel color — keeps the wave hue but very desaturated and light
  const panelColor = `hsl(${waveHue}, ${Math.min(waveSat, 18)}%, 92%)`;
  const panelShadow = `hsl(${waveHue}, ${Math.min(waveSat, 25)}%, 75%)`;

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
          {/* Wind/wave background + paper grain (grain renders first, waves paint over) */}
          <WindBackground
            variation={variation}
            styleName={beer?.recipe?.style?.name || ""}
            estimatedColor={beer?.estimatedColor}
          />

          {/* Left perforation cloud — full height */}
          <Flex
            height="100%"
            background={panelColor}
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0px/50px 50px"
            position="absolute"
            left="-30px"
            zIndex="4"
            width="50px"
          />
          <Flex
            height="100%"
            background={panelShadow}
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
            background={panelColor}
            top="0"
            mask="radial-gradient(farthest-side,#000 98%,#0000) 0 0/50px 50px"
            position="absolute"
            right={`${rightPanelWidth - 28}px`}
            zIndex="4"
          />
          <Flex
            height="100%"
            width="50px"
            background={panelShadow}
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
            background={panelColor}
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
            alignItems="center"
            color="#044350"
            position="absolute"
            left="72px"
            top="50%"
            transform="translateY(-55%)"
            zIndex="2"
            background="radial-gradient(ellipse, #fff 50%, transparent 70%)"
            p="20px"
            opacity="0.9"
          >
            <RocketLogo width={180} height={245} boltColor="#044350" />
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
              <Box opacity="0.8" ml="60px" mt="-20px">
                <Image src="/textLogo.svg" alt="" width={150} height={60} />
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
