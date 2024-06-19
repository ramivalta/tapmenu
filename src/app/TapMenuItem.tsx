"use client";

import { Box, Heading, Text, List, ListItem, Flex, Divider } from "@chakra-ui/layout";
import { CloseButton, Select } from "@chakra-ui/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";
import { round } from "lodash";

const TapMenuItem = ({
  batch,
  batches,
  tap,
  showHops,
  showFermentables,
}: {
  batches: any[];
  batch: any;
  tap: string;
  showHops: number;
  showFermentables: number;
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

  return (
    <Flex
      flexDirection="column"
      p="4"
      width="50%"

    >
      <Flex>

        <Select
          size="lg"
          fontWeight="bold"

          defaultValue={batch?._id}

          className="sel"
          onChange={(e) => {
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
        </Select>
      </Flex>


      {batch && (
        <Flex flexDir="column" gap="4" py="4">
          <Flex justifyContent="" gap="3">

            
            <Text>
              {round(batch.recipe?.abv, 1)}% ABV
            </Text>

            <Divider orientation="vertical" />

            <Text>
              {round(batch.recipe?.ibu)} IBU
            </Text>

            <Divider orientation="vertical" />

            <Text>
              {batch?.recipe?.style?.name}
            </Text>
          </Flex>

          {showFermentables ? (
            <Fragment>
              <Heading fontSize="22px">Fermentables</Heading>

              <List display="flex" flexDirection="column">
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
            </Fragment>
          ) : null}


          {showHops ? (
            <Fragment>
              {hopsGroupedByUse && (
                <Fragment>
                  <Heading fontSize="22px">Hops</Heading>

                  <Flex
                    flexDirection="row"
                    width="100%"
                    justifyContent="space-between"
                    gap="8"
                  >
                    {Object.keys(hopsGroupedByUse).map((use) => {
                      return (
                        <Flex
                          flexDirection="column"
                          key={use}
                          width="100%"


                        // gap="3"
                        // _last={{
                        //   gap: 0,
                        // }}
                        >
                          <Heading fontSize="18px">{use}</Heading>

                          <List
                            gap="3"
                            width="100%"

                          >
                            {hopsGroupedByUse[use].map((hop: any) => {
                              return (
                                <ListItem
                                  key={hop._id}
                                  width="100%"

                                  display="flex"
                                  justifyContent="space-between"

                                >
                                  <Text as="span">{hop.name}</Text>
                                  <Text as="span">{hop.amount}g</Text>
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

            </Fragment>

          ) : null}

        </Flex>
      )}
    </Flex>
  );
};

export default TapMenuItem;
