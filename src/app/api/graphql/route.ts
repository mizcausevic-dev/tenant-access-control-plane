import { createYoga } from "graphql-yoga";

import { schema } from "@/lib/graphql/schema";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response, Request, Headers },
  landingPage: false,
});

export const runtime = "nodejs";

export { yoga as GET, yoga as POST };
