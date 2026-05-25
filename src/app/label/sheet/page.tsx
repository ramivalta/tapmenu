import { Box, Flex } from "@chakra-ui/react";
import A4Sheet from "./A4Sheet";
import SheetSelect from "./SheetSelect";
import { Fragment } from "react";

const token = process.env.BREWFATHER_API_TOKEN;

export default async function SheetPage({
  params,
  searchParams,
}: Readonly<{ params: any; searchParams: any }>) {
  try {
    const batches = await fetch(
      "https://api.brewfather.app/v2/batches?complete=True&limit=50&order_by=brewDate&order_by_direction=desc",
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
        next: {
          revalidate: 1,
        },
      },
    );
    const batchesData = await batches.json();
    const sps = await searchParams;
    const id = sps?.beer;

    const beer = batchesData?.find((batch: any) => {
      return batch._id === id;
    });

    return (
      <Fragment>
        <SheetSelect batches={batchesData} />
        <Flex p="6" gap="4">
          <A4Sheet beer={beer} />
        </Flex>
      </Fragment>
    );
  } catch (e: any) {
    console.error(e);
    return <Box>Error fetching data</Box>;
  }
}
