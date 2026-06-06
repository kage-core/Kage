# Dockerfile for the Glama MCP registry.
# Builds the Kage MCP server from source and runs it over stdio.
# Glama's check only needs the server to start and respond to an MCP
# introspection (initialize + tools/list) request, which this image satisfies.
FROM node:20-slim

WORKDIR /app/mcp

# Install dependencies against the committed lockfile for reproducible builds.
COPY mcp/package.json mcp/package-lock.json ./
RUN npm ci

# Build the TypeScript MCP server (index.ts -> dist/index.js).
COPY mcp/ ./
RUN npm run build

# The MCP server speaks JSON-RPC over stdio.
CMD ["node", "dist/index.js"]
