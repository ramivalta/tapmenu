"use client";

import { Flex, Button } from "@chakra-ui/react";
// import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import saveTapConfigAction from "./saveTapConfigAction";
import { useEffect } from "react";

const Controls = ({
  showHops,
  showFermentables,
  savedTapConfig,
}: {
  showHops: number;
  showFermentables: number;
  savedTapConfig: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (savedTapConfig) {
      router.replace(`/?${new URLSearchParams(savedTapConfig).toString()}`);
    }
  }, []);

  return (
    <Flex p="1" gap="4" px="8">
      <Button
        size="xs"
        colorPalette="cyan"
        as="span"
        px="4"
        onClick={async (e) => {
          const searchParamsObj = Object.fromEntries(searchParams);
          await saveTapConfigAction(
            JSON.stringify(searchParamsObj, null, 4),
            prompt("Enter password")
          );
        }}
      >
        Save tap config
      </Button>
    </Flex>
  );
};

export default Controls;
