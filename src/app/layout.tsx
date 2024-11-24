"use client";

import "./globals.css";
import { Box, Center, Flex, Image } from "@chakra-ui/react";

import { Provider } from "@/components/ui/provider";
// import Image from "next/image";

import bg from "/Panimo_Valta-taustalogo.png";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        ></link>
      </head>
      <body>
        <Provider>
          <Image
            src="/noisy-gradient.svg"
            backgroundRepeat="repeat"
            backgroundSize="cover"
            minHeight="100vh"
            flexDirection="column"
            width="100%"
            flex="1"
            alt=""
            position="fixed"
          />
          <Flex
            backgroundImage="/noisy-gradient.svg"
            backgroundRepeat="repeat"
            backgroundSize="cover"
            minHeight="100vh"
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
              <Image
                alt=""
                height="100%"
                backgroundSize="contain"
                backgroundRepeat="no-repeat"
                backgroundAttachment="fixed"
                backgroundPosition="center"
                margin="auto"
                src="/Panimo_Valta-taustalogo.png"
                position="fixed"
                top="0"
                left="0"
                right="0"
                bottom="0"
              />
            </Center>
            <Box position="relative" zIndex="1">
              {children}
            </Box>
          </Flex>
        </Provider>
      </body>
    </html>
  );
}
