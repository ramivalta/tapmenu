import {
  Box,
  Center,
  Heading,
  Flex,
  Text,
  Stack,
  Link as ChakraLink,
} from "@chakra-ui/layout";
import { orderBy, round } from "lodash";
import Link from "next/link";

const BrewHistory = ({ batches }) => {
  return (
    <Center flexDirection="column" gap="4" width="100%" my="8">
      <Stack justifyContent="flex-start" minWidth="400px">
        <Text color="black">
          <Link href="/">Go to current menu</Link>
        </Text>
        <Heading as="h1" color="black">
          Archived batches
        </Heading>
      </Stack>

      <Flex
        flexWrap="wrap"
        gap="4"
        alignItems="flex-start"
        justifyContent="center"
      >
        {orderBy(batches, "brewDate", "desc").map((batch) => {
          const fullUntappedLink = batch?.batchNotes?.match(
            /https:\/\/untappd.com\/b\/[^ ]*/g
          )?.[0];
          return (
            <Flex
              minWidth="440px"
              key={batch._id}
              p="6"
              boxShadow="rgba(0, 0, 0, 0.25)"
              color="#044350"
              justifyContent="space-between"
              background="rgba(255, 255, 255, 0.5)"
              backdropFilter="blur(16px)"
              borderRadius="6"
              flexDirection="column"
              gap="2"
            >
              <Heading as="h3" fontSize="xl">
                {batch.recipe.name}
              </Heading>

              <Box>
                {batch?.recipe?.style?.name}

                <Text fontSize="xl" fontWeight="bold">
                  {round(batch?.measuredAbv, 1)}% ABV
                </Text>

                <Text>
                  {round(batch?.estimatedIbu)} IBU | Brew date{" "}
                  {new Date(batch.brewDate).toLocaleDateString("fi-FI")}
                </Text>

                <Text></Text>
              </Box>

              {fullUntappedLink && (
                <ChakraLink href={fullUntappedLink} textDecoration="underline">
                  Untappd
                </ChakraLink>
              )}

              {/* <p>{batch.brewday.date}</p>
                      <p>{batch.brewday.brewer}</p> */}
            </Flex>
          );
        })}
      </Flex>
    </Center>
  );
};
export default BrewHistory;
