# WindsorEssexCycling

WindsorEssexCycling is a bicycle-oriented map maintained by [Windsor Hackforge](hackf.org) as part
of the City-County Cycling Tech (C3Tech) initiative, built on top of [OpenStreetMap](https://www.openstreetmap.org)
data. It aims at providing a beautiful and practical map for cyclists, no matter their cycling habits or abilities.

The website can be view at: [windsoressexcycling.ca](https://windsoressexcycling.ca).

## Development

> An LTS version of `nodejs` and `npm` is required to run the development server.

To install the dependencies and start the dev server, execute the following commands:

    npm ci
    npm start

## Production

To compile the production build, execute the following commands:

    npm ci
    npm run build

A simple web server can be used to test the build by executing the following command:

    npm run serve

## Standalone Brouter Server

To run a standalone Brouter HTTPServer that has been containerized, the following steps need to be executed.

### Step 1: Build the docker image

To build the docker image one needs to be sure of the LAT and LNG of the location of interest.  
The routing segment files provisioned by Brouter are organized in a 5*5 degrees, with the filename containing the southwest corner of the square.  
To have the container download the segment file `N40_W85.rd5`, and have the Brouter server point to it we execute the following `docker build` command:

```sh
docker build -t brouter-server:N40_W85 --build-arg LAT=N40 --build-arg LNG=W85 .
```

### Step 2: Run the container

To run the image build above, in order to spawn the Brouter routing server, the following command needs to be executed:

```sh
docker run -p 127.0.0.1:17777:17777 we-cycling:latest
```

### Step 3: Make the call for routing

The complete set of API end points exposed by Brouter server are documented [here](https://github.com/abrensch/brouter/blob/master/brouter-server/src/main/java/btools/server/request/ServerHandler.java).  
An example url for Windsor-Essex is:

```url
http://127.0.0.1:17777/brouter?lonlats=-82.992005,42.303384%20|-82.989140,42.306258&nogos=&profile=trekking&alternativeidx=0&format=geojson
```

This gives the url can be polled to get the routing directions in the form of a `geojson`.  
A sample response looks like :

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "creator": "BRouter-1.6.3",
                "name": "brouter_trekking_0",
                "track-length": "547",
                "filtered ascend": "0",
                "plain-ascend": "0",
                "total-time": "82",
                "total-energy": "8198",
                "cost": "810",
                "messages": [
                    [
                        "Longitude",
                        "Latitude",
                        "Elevation",
                        "Distance",
                        "CostPerKm",
                        "ElevCost",
                        "TurnCost",
                        "NodeCost",
                        "InitialCost",
                        "WayTags",
                        "NodeTags",
                        "Time",
                        "Energy"
                    ],
                    [
                        "-82992930",
                        "42305037",
                        "187",
                        "199",
                        "1150",
                        "0",
                        "0",
                        "0",
                        "0",
                        "reversedirection=yes highway=residential surface=asphalt",
                        "",
                        "21",
                        "2139"
                    ],
                    [
                        "-82987893",
                        "42304117",
                        "187",
                        "348",
                        "1150",
                        "0",
                        "180",
                        "0",
                        "0",
                        "highway=residential surface=asphalt",
                        "",
                        "81",
                        "8198"
                    ]
                ],
                "times": [
                    0,
                    21.396,
                    39.375,
                    56.411,
                    68.127,
                    79.813,
                    81.968
                ]
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [
                        -82.991890,
                        42.303424,
                        188.5
                    ],
                    [
                        -82.992930,
                        42.305037,
                        187.0
                    ],
                    [
                        -82.991955,
                        42.305383,
                        188.5
                    ],
                    [
                        -82.991015,
                        42.305712,
                        189.0
                    ],
                    [
                        -82.990178,
                        42.306024,
                        188.0
                    ],
                    [
                        -82.989306,
                        42.306333,
                        187.5
                    ],
                    [
                        -82.989237,
                        42.306224,
                        187.5
                    ]
                ]
            }
        }
    ]
}
```
