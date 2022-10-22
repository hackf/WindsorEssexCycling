FROM gradle:jdk11-jammy as build

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN git clone https://github.com/abrensch/brouter.git
WORKDIR /usr/src/app/brouter
RUN ./gradlew clean build

FROM openjdk:11-jdk-slim-buster 

ARG LAT
ARG LNG

RUN apt-get update -qq \
    && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/brouter
RUN mkdir /opt/brouter/segments4
RUN mkdir /opt/brouter/profiles2
RUN mkdir /opt/brouter/profiles2/customprofiles
RUN cd /opt/brouter/segments4 \
  && curl -o ${LNG}_${LAT}.rd5 http://brouter.de/brouter/segments4/${LNG}_${LAT}.rd5

WORKDIR /opt/brouter
COPY --from=build /usr/src/app/brouter/misc/profiles2/* ./profiles2/
COPY --from=build /usr/src/app/brouter/brouter-server/build/libs/brouter-1.6.3-all.jar ./brouter.jar
COPY ./brouter_profiles/* ./profiles2/customprofiles/

EXPOSE 17777

ENV JAVA_TOOL_OPTIONS="-Xmx128M -Xms128M -Xmn8M -DmaxRunningTime=300"
ENTRYPOINT ["java", "-cp", "./brouter.jar", "btools.server.RouteServer", "./segments4", "./profiles2", "customprofiles", "17777", "1"]
