FROM ubuntu:22.04

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 libgcc-s1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Unity Linux Dedicated Server output should be copied into this folder before build.
COPY ./Builds/LinuxDedicatedServer/ /app/

RUN chmod +x /app/koschei-server.x86_64

ENV PORT=7777
ENV UNITY_SERVER_PORT=7777

EXPOSE 7777/udp
EXPOSE 7777/tcp

CMD ["/bin/bash", "-lc", "./koschei-server.x86_64 -batchmode -nographics -port ${UNITY_SERVER_PORT}"]
