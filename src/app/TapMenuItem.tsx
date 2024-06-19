"use client";

import { Box, Heading, Text, List, ListItem, Flex } from "@chakra-ui/layout";
import { CloseButton, Select } from "@chakra-ui/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";
import { round } from "lodash";

const TapMenuItem = ({
  batch,
  batches,
  tap,
}: {
  batches: any[];
  batch: any;
  tap: string;
}) => {
  const hopsGroupedByUse = batch?.recipe?.hops?.reduce((acc: any, hop: any) => {
    if (!acc[hop.use]) {
      acc[hop.use] = [];
    }

    !acc[hop.use].some((hopInAcc) => hopInAcc._id === hop._id) &&
      acc[hop.use].push(hop);

    return acc;
  }, {});

  const router = useRouter();
  const searchParams = useSearchParams();
  console.log("MENU ITEM PARMS?", batch);

  return (
    <Flex
      flexDirection="column"
      p="12"
      width="50%"
      _hover={{
        ".sel": {
          opacity: "1 !important",
        },
        button: {
          opacity: "1 !important",
        },
      }}
    >
      <Flex gap="8">
        <select
          defaultValue={batch?._id}
          style={{
            opacity: 0,
            transition: "0.35s all",
          }}
          className="sel"
          onChange={(e) => {
            const selectedBatch = batches.find(
              (batch) => batch._id === e.target.value
            );

            const params = new URLSearchParams(searchParams.toString());
            params.set(tap, selectedBatch._id);

            router.replace(`
            /?${params.toString()}
          `);
          }}
        >
          <option>-</option>

          {batches.map((batch) => {
            return (
              <option value={batch._id} key={batch.id}>
                {batch?.recipe?.name}
              </option>
            );
          })}
        </select>
        {batch && (
          <CloseButton
            size="xs"
            opacity="0"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete(tap);

              router.replace(`
              /?${params.toString()}
            `);
            }}
          />
        )}
      </Flex>
      <Flex flexDir="column" gap="2" py="4">
        <Flex gap="4">
          {/* <Text display="inline" textTransform="uppercase" fontSize="24"> */}
          {/* {tap} */}
          {/* </Text> */}
          {batch && (
            <Fragment>
              {/* <Text fontSize="24">-</Text> */}
              <Text display="inline" fontSize="24">
                {batch?.recipe?.name}
              </Text>
            </Fragment>
          )}
        </Flex>
      </Flex>

      {batch && (
        <Flex flexDir="column" gap="4" py="4">
          <Text>
            {batch?.recipe?.style?.name} - {batch?.recipe?.style?.category}
          </Text>
          <Text>
            {round(batch.recipe?.abv, 1)}% ABV - {round(batch.recipe?.ibu)} IBU
          </Text>

          <Heading fontSize="22px">Fermentables</Heading>

          <List gap="3" display="flex" flexDirection="column">
            {batch.recipe?.data?.mashFermentables?.map((fermentable: any) => {
              return (
                <Fragment key={fermentable._id}>
                  <ListItem
                    display="flex"
                    justifyContent="space-between"
                    width="100%"
                  >
                    <Text>{fermentable.name}</Text>
                    <Text>{round(fermentable.percentage, 0)}%</Text>
                  </ListItem>
                </Fragment>
              );
            })}
          </List>

          {hopsGroupedByUse && (
            <Fragment>
              <Heading fontSize="22px">Hops</Heading>

              <Flex
                flexDirection="row"
                gap="7"
                width="100%"
                justifyContent="space-between"
              >
                {Object.keys(hopsGroupedByUse).map((use) => {
                  return (
                    <Flex
                      flexDirection="column"
                      key={use}
                      gap="3"
                      _last={{
                        gap: 0,
                      }}
                    >
                      <Heading fontSize="18px">{use}</Heading>

                      <List
                        gap="3"
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                      >
                        {hopsGroupedByUse[use].map((hop: any) => {
                          return (
                            <ListItem
                              key={hop._id}
                              display="flex"
                              justifyContent="space-between"
                              width="100%"
                              gap="16"
                              _last={{
                                pr: 0,
                              }}
                            >
                              <Text>{hop.name}</Text>
                              <Text>{hop.amount}g</Text>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Flex>
                  );
                })}
              </Flex>
            </Fragment>
          )}
        </Flex>
      )}
    </Flex>
  );
};

export default TapMenuItem;
