import Image from "next/image";
import "./globals.css";
import {
  AbsoluteCenter,
  Box,
  Center,
  ChakraProvider,
  Flex,
} from "@chakra-ui/react";
import Controls from "./Controls";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body>
        <ChakraProvider>
          <Flex
            backgroundImage="/noisy-gradient.svg"
            backgroundRepeat="repeat"
            backgroundSize="cover"
            minHeight="100vh"
            // justifyContent="center"
            flexDirection="column"
            width="100%"
            flex="1"
          >
            <Center
              position="absolute"
              top="0"
              bottom="0"
              left="0"
              right="0"
              alignItems="center"
              justifyContent="center"
              zIndex="0"
            >
              <Box
                width="100%"
                height="100%"
                backgroundImage="/Panimo_Valta-taustalogo.png"
                backgroundSize="contain"
                backgroundRepeat="no-repeat"
                backgroundAttachment="fixed"
                backgroundPosition="center"
                margin="auto"
              />
            </Center>
            <Box position="relative" zIndex="1">
              {children}
            </Box>
          </Flex>
        </ChakraProvider>
      </body>
    </html>
  );
}
