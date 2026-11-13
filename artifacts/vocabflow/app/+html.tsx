import type { PropsWithChildren } from "react";
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } =
    useServerDocumentContext();

  return (
    <html {...htmlAttributes} lang="vi" translate="no">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta name="google" content="notranslate" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
