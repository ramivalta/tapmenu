"use client";

import {
  Box,
  Heading,
  Text,
  // List,
  ListItem,
  Flex,
  Stack,
  Separator,
  Input,
} from "@chakra-ui/react";
import { Link, Textarea } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";
import { round, uniq } from "lodash";
import QRCode from "react-qr-code";
import { getWaveColor, srmColors } from "./beerStyleColors";

const beerColors = srmColors;

/**
 * Wind waves + paper grain for the tap menu cards.
 * Uses a wide viewBox offset by tap position so waves flow continuously
 * across all 4 cards.
 */
function TapWindBackground({
  styleName,
  estimatedColor,
  tapNumber,
}: {
  styleName: string;
  estimatedColor: number | undefined;
  tapNumber: string;
}) {
  const [baseHue, baseSat, baseLightness] = getWaveColor(
    styleName,
    estimatedColor,
  );
  const tapIndex = (parseInt(tapNumber) || 1) - 1;

  // Total width spans all 4 cards; each card shows a 420px slice
  const totalWidth = 1680; // 420 * 4
  const offsetX = tapIndex * 420;

  // Generate waves that span the full width (seeded consistently across all taps)
  const waves = Array.from({ length: 4 }, (_, i) => {
    const amplitude = 14 + i * 4;
    const frequency = 0.004 + i * 0.001;
    const yOffset = 60 + i * 95;
    const phase = i * 1.2;
    return { amplitude, frequency, yOffset, phase };
  });

  const paths = waves.map((wave, i) => {
    const points = [];
    for (let x = offsetX; x <= offsetX + 420; x += 5) {
      const baseY =
        wave.yOffset +
        Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
        Math.sin(x * wave.frequency * 1.7 + wave.phase * 2) *
          (wave.amplitude * 0.4);
      const t = x / totalWidth;
      const thickness =
        (6 + i * 3) * (0.4 + Math.sin(t * Math.PI * 2 + wave.phase) * 0.6);
      points.push({ x: x - offsetX, baseY, thickness });
    }

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
        fill={`hsla(${baseHue}, ${baseSat}%, ${baseLightness}%, ${0.18 - i * 0.03})`}
        stroke="none"
      />
    );
  });

  // Paper grain
  const grainDots = Array.from({ length: 200 }, (_, i) => {
    const hash = (s: number) => {
      let t = (s + 0x6d2b79f5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const base = tapIndex * 7919 + i;
    const x = hash(base);
    const y = hash(base + 100003);
    const size = hash(base + 200003);
    return (
      <circle
        key={`grain-${i}`}
        cx={x * 420}
        cy={y * 450}
        r={0.5 + size * 1}
        fill="#000"
        opacity={0.05 + size * 0.05}
      />
    );
  });

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      viewBox="0 0 420 450"
      preserveAspectRatio="xMidYMid slice"
    >
      {grainDots}
      {paths}
    </svg>
  );
}

const TapMenuItem = ({
  batch,
  batches,
  tap,
  showHops,
  showFermentables,
  tapNumber,
  taps,
  tapNotes,
}: {
  batches: any[];
  batch: any;
  tap: string;
  showHops: number;
  showFermentables: number;
  tapNumber: string;
  taps: string[];
  tapNotes?: string;
}) => {
  const hopsGroupedByUse = useMemo(
    () =>
      batch?.recipe?.hops?.reduce((acc: any, hop: any) => {
        if (!acc[hop.use]) {
          acc[hop.use] = [];
        }

        !acc[hop.use].some((hopInAcc: any) => hopInAcc._id === hop._id)
          ? acc[hop.use].push(hop)
          : (acc[hop.use].find(
              (hopInAcc: any) => hopInAcc._id === hop._id,
            ).amount += hop.amount);

        return acc;
      }, {}),
    [],
  );

  const hops = uniq(batch?.recipe?.hops.map((hop: any) => hop.name));

  const router = useRouter();
  const searchParams = useSearchParams();

  const fullUntappedLink = batch?.batchNotes?.match(
    /https:\/\/untappd.com\/b\/[^ ]*/g,
  )?.[0];
  const untappedBeerId = fullUntappedLink?.match(/b\/([^ ]*)/)?.[1];
  const qrCodeUrl = untappedBeerId
    ? `https://untappd.com/qr/beer/${untappedBeerId?.split("/")[1]}`
    : null;

  return (
    <Flex
      flexDirection="column"
      color="#044350"
      width="100%"
      minHeight={["auto", "300px"]}
      py="6"
      position="relative"
      px="6"
    >
      <Text
        position="absolute"
        opacity="0.33"
        fontSize="124px"
        bottom="0"
        left="6"
        textShadow="0px 0px 16px"
      >
        {tapNumber}.
      </Text>

      {!batch && (
        <Heading as="h4" fontSize="2xl" mt="1" opacity="0.5">
          Currently empty
        </Heading>
      )}

      {batch && (
        <Fragment>
          <TapWindBackground
            styleName={batch?.recipe?.style?.name}
            estimatedColor={batch?.estimatedColor}
            tapNumber={tapNumber}
          />

          <Box
            opacity="0.15"
            left="0"
            right="0"
            bottom="0"
            height="320px"
            position="absolute"
            backgroundImage={`linear-gradient(180deg, transparent 0%, ${
              beerColors[round(batch?.estimatedColor, 0)]
            } 100%)`}
          ></Box>

          <Box
            left="0"
            right="0"
            bottom="0"
            height="16px"
            position="absolute"
            backgroundColor={beerColors[round(batch?.estimatedColor, 0)]}
            opacity="0.5"
            zIndex="0"
          />
        </Fragment>
      )}

      <Flex
        alignItems="center"
        borderBottom={batch ? "3px solid #044350" : ""}
        position="relative"
        zIndex="1"
      >
        <select
          className="beer-label sel"
          style={{
            borderColor: "transparent",
            fontSize: "24px",
            marginLeft: "-2px",
            opacity: batch ? 1 : 0.2,
            color: "#044350",
            background: "transparent",
            width: "100%",
            WebkitAppearance: "none",
          }}
          value={batch?._id}
          onChange={(e) => {
            if (taps.includes(e.target.value)) {
              return;
            }

            const selectedBatch = batches.find(
              (batch) => batch._id === e.target.value,
            );

            const params = new URLSearchParams(searchParams.toString());
            if (selectedBatch) {
              params.set(tap, selectedBatch._id);
            } else {
              params.delete(tap);
            }

            router.replace(`
              /?${params.toString()}
            `);
          }}
        >
          <option>-</option>

          {batches.map((batch, index) => {
            return (
              <option value={batch._id} key={batch.id + "_" + index}>
                {batch?.recipe?.name}
              </option>
            );
          })}
        </select>
      </Flex>

      <Flex
        flexDir="column"
        gap="4"
        py="4"
        position="relative"
        className="beer-data"
        fontSize="lg"
        flex="1"
      >
        {batch && (
          <Flex flexDirection="column" gap="4" justifyContent="space-between">
            <Stack flex="1" gap="2">
              <Fragment>
                <Stack
                  flexDirection="row"
                  gap="2"
                  fontSize="xl"
                  fontWeight="bold"
                >
                  <Text whiteSpace="nowrap">
                    {round(batch?.measuredAbv, 1)}% ABV
                  </Text>

                  {" |"}

                  <Text whiteSpace="nowrap">
                    {round(batch?.estimatedIbu)} IBU
                  </Text>
                </Stack>
                <Stack>
                  <Text fontVariantCaps="all-small-caps" fontSize="2xl">
                    {batch?.recipe?.style?.name}
                  </Text>
                </Stack>
              </Fragment>

              <Stack flexDirection="column">
                {/* {batch && (
                <Text whiteSpace="nowrap">
                  {round(batch?.estimatedIbu)} IBU
                </Text>
              )} */}

                {/* <Text>
                  {hops.map((hop: any, index, arr) => {
                    return (
                      <Fragment key={hop}>
                        {hop}
                        {arr[index + 1] ? ", " : "."}
                      </Fragment>
                    );
                  })}
                </Text> */}

                {batch?.bottlingDate ? (
                  <Stack gap="2">
                    Kegitetty{" "}
                    {new Date(batch?.bottlingDate).toLocaleDateString("en-US", {
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Stack>
                ) : (
                  ""
                )}
              </Stack>
            </Stack>

            <Stack
              flexDirection="row"
              alignItems="flex-start"
              justifyContent="space-between"
              minHeight="100px"
            >
              {qrCodeUrl && (
                <Box position="absolute" right="0" bottom="0">
                  <Link
                    href={qrCodeUrl}
                    background="#eee"
                    p="1"
                    borderRadius="6px"
                  >
                    <QRCode
                      value={qrCodeUrl}
                      size={96}
                      fgColor="black"
                      bgColor="transparent"
                    />
                  </Link>
                </Box>
              )}
            </Stack>

            <Textarea
              resize="none"
              _hover={{
                border: "1px solid",
              }}
              border="0"
              defaultValue={tapNotes}
              pl="124px"
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set(tap + "Notes", e.target.value);
                router.replace(`
                /?${params.toString()}
              `);
              }}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};

export default TapMenuItem;
