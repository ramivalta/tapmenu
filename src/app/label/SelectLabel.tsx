"use client";

import { orderBy } from "lodash";
import { useRouter } from "next/navigation";

const SelectEtiquette = ({ batches }: { batches: any[] }) => {
  const router = useRouter();
  return (
    <select
      onChange={(e) => {
        router.push(`/label?beer=${e.target.value}`);
      }}
    >
      <option>-</option>
      {orderBy(batches, "brewDate", "desc").map((batch: any, index: number) => {
        return (
          <option value={batch._id} key={batch.id + "_" + index}>
            {batch?.recipe?.name}
          </option>
        );
      })}
    </select>
  );
};

export default SelectEtiquette;
