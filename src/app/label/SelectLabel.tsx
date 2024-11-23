"use client";

import { Spinner, Flex } from "@chakra-ui/react";
import { orderBy } from "lodash";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useTransition } from "react";

const SelectEtiquette = ({ batches }: { batches: any[] }) => {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <Flex alignItems="center" gap="2">
      <select
        defaultValue={searchParams.get("beer") ?? undefined}
        onChange={(e) => {
          startTransition(() => {
            router.push(`/label?beer=${e.target.value}`);
          });
        }}
      >
        <option>-</option>
        {orderBy(batches, "brewDate", "desc").map(
          (batch: any, index: number) => {
            return (
              <option value={batch._id} key={batch.id + "_" + index}>
                {batch?.recipe?.name}
              </option>
            );
          }
        )}
      </select>
      {isPending ? <Spinner size="xs" /> : null}
    </Flex>
  );
};

export default SelectEtiquette;
