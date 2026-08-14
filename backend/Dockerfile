FROM python:3.12-slim

ARG NODE_VERSION=22.16.0
RUN apt-get update && apt-get install -y --no-install-recommends curl git xz-utils \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      | tar -xJ --strip-components=1 -C /usr/local \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN git clone --depth 1 --branch 1.3.1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil \
    && cd /opt/bgutil/server && npm ci && npx tsc
COPY main.py resolver.py search.py start.sh ./
RUN chmod +x start.sh
ENV PORT=8000
EXPOSE 8000
CMD ["./start.sh"]
