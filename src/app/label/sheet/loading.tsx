import { Spinner, Flex } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Flex p="6" justifyContent="center" alignItems="center" minHeight="200px">
      <Spinner size="lg" />
    </Flex>
  );
}
