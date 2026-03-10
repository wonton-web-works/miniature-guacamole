#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { getResourceList, handleResourceRead } from './resources/workstreams.js';
import { getMemoryResourceList, handleMemoryRead } from './resources/memory.js';
import { getEventsResourceList, handleEventsRead } from './resources/events.js';

// ---------------------------------------------------------------------------
// MCP server entry point
// AC-MCP-0.2: Uses StdioServerTransport from the SDK
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'mg-mcp-server', version: '0.1.0' },
  { capabilities: { resources: {} } }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      ...getResourceList(),
      ...getMemoryResourceList(),
      ...getEventsResourceList(),
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  // Route to the correct handler based on URI prefix
  if (typeof uri === 'string' && uri.startsWith('mg://memory')) {
    return await handleMemoryRead(uri);
  }

  if (typeof uri === 'string' && uri.startsWith('mg://events')) {
    return await handleEventsRead(uri);
  }

  const result = await handleResourceRead(uri);

  // If handleResourceRead returned an error shape, convert to MCP error
  if ('error' in result) {
    const { error } = result;
    throw new McpError(error.code ?? ErrorCode.InternalError, error.message);
  }

  return result;
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[mg-mcp-server] Fatal error:', err);
  process.exit(1);
});
