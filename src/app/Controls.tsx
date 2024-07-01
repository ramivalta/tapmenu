"use client";

import { Flex } from "@chakra-ui/layout"
import { Button } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import saveTapConfigAction from "./saveTapConfigAction";
import { isEmpty } from "lodash";
import { useEffect } from "react";

const Controls = ({
  showHops,
  showFermentables,
  savedTapConfig
}: {
  showHops: number;
  showFermentables: number;
  savedTapConfig: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log("SEARCH PARAMS", searchParams.toString(), "SAVED CONFIG", savedTapConfig);

    if (isEmpty(searchParams.toString())) {
      if (savedTapConfig) {
        router.replace(`/?${new URLSearchParams(savedTapConfig).toString()}`);
      }
    }
  }, []);

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

      {/* <Button size="xs" colorScheme="gray" onClick={async (e) => {
        const newUrl = await urlGenerator(window.location.href);
        navigator.clipboard.writeText(newUrl);
      }}>
        Share link
      </Button> */}

      <Button size="xs" colorScheme="gray" onClick={async (e) => {
        const searchParamsObj = Object.fromEntries(searchParams);
        await saveTapConfigAction(
          JSON.stringify(searchParamsObj, null, 4),
          prompt("Enter password")
        )
      }}>
        Save tap config
      </Button>
    </Flex >
  );
}


export default Controls;