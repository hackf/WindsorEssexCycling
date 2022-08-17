FROM gradle:jdk11-jammy

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ARG LAT
ARG LNG
RUN git clone https://github.com/abrensch/brouter.git
WORKDIR /usr/src/app/brouter
RUN ./gradlew clean build
WORKDIR /usr/src/app/brouter/misc
RUN mkdir segments4
WORKDIR /usr/src/app/brouter/misc/segments4
RUN curl -o W${LNG}_N${LAT}.rd5 http://brouter.de/brouter/segments4/W${LNG}_N${LAT}.rd5
WORKDIR /usr/src/brouter

EXPOSE 17777

ENTRYPOINT [ "/bin/bash", "/usr/src/app/brouter/misc/scripts/standalone/server.sh"]



