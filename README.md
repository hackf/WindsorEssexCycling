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

