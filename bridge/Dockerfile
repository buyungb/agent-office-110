# Build from the repository root: docker build -f bridge/Dockerfile .
FROM node:24.22.0-alpine

WORKDIR /app
COPY bridge/package.json ./
COPY bridge/src ./src
# The team list is shared with the 3D office so person ids always match.
COPY dist/team.js ./team.js
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production PORT=8080 DATA_DIR=/data TEAM_FILE=/app/team.js
USER node
VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "src/server.js"]
