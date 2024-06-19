"use client";

import { Box, Flex } from "@chakra-ui/layout"
import { Button } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";

const Controls = ({
  showHops,
  showFermentables
}: {
  showHops: number;
  showFermentables: number;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <Flex p="1" gap="4">
        <Button
          colorScheme="gray"
          size="xs"
          onClick={e => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("showHops", Number(!showHops).toString())
            router.replace(`
            /?${params.toString()}
          `);
          }}>
          {showHops ? "Hide hops" : "Show hops"}

        </Button>

        <Button
          size="xs"

          colorScheme="gray" onClick={e => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("showFermentables", Number(!showFermentables).toString());
            router.replace(`
            /?${params.toString()}
          `);
          }}>
          {showFermentables ? "Hide fermentables" : "Show fermentables"}
        </Button>
    </Flex>
  );
}


export default Controls;