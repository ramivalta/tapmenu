import { Box, Flex, Select } from "@chakra-ui/react";
import SelectLabel from "./SelectLabel";
import Label from "./Label";
import { Fragment } from "react";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function History({
  params,
  searchParams,
}: Readonly<{ params: any; searchParams: any }>) {
  try {
    const batches = await fetch(
      // "https://api.brewfather.app/v2/batches?include=[brewday,recipe,batchNotes,batch.notes]&status=Completed",
      // "https://api.brewfather.app/v2/batches?complete=True",
      "https://api.brewfather.app/v2/batches?complete=True&limit=50",
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
        next: {
          revalidate: 1,
        },
      }
    );
    const batchesData = await batches.json();
    const sps = await searchParams;
    const id = sps?.beer;

    const beer = batchesData?.find((batch: any) => {
      return batch._id === id;
    });

    return (
      <Fragment>
        <SelectLabel batches={batchesData} />
        <Flex p="6" gap="4">
          <Label beer={beer} />
        </Flex>
      </Fragment>
    );
  } catch (e: any) {
    console.error(e);
    return <Box>Error fetching data</Box>;
  }
}
