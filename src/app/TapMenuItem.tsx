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

const beerColors = [
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
              (hopInAcc: any) => hopInAcc._id === hop._id
            ).amount += hop.amount);

        return acc;
      }, {}),
    []
  );

  const hops = uniq(batch?.recipe?.hops.map((hop: any) => hop.name));

  const router = useRouter();
  const searchParams = useSearchParams();

  const fullUntappedLink = batch?.batchNotes?.match(
    /https:\/\/untappd.com\/b\/[^ ]*/g
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
          <Box
            opacity="0.4"
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
              (batch) => batch._id === e.target.value
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
                      {new Date(batch?.bottlingDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}
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
