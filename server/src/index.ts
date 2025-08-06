import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  generateReadmeInputSchema,
  getReadmeInputSchema,
  listReadmesInputSchema
} from './schema';

// Import handlers
import { generateReadme } from './handlers/generate_readme';
import { getReadme } from './handlers/get_readme';
import { listReadmes } from './handlers/list_readmes';
import { deleteReadme } from './handlers/delete_readme';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Generate a new README for a GitHub repository
  generateReadme: publicProcedure
    .input(generateReadmeInputSchema)
    .mutation(({ input }) => generateReadme(input)),

  // Get a specific generated README by ID
  getReadme: publicProcedure
    .input(getReadmeInputSchema)
    .query(({ input }) => getReadme(input)),

  // List all generated READMEs with pagination
  listReadmes: publicProcedure
    .input(listReadmesInputSchema)
    .query(({ input }) => listReadmes(input)),

  // Delete a generated README by ID
  deleteReadme: publicProcedure
    .input(getReadmeInputSchema)
    .mutation(({ input }) => deleteReadme(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();