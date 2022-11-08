import { divIcon } from "leaflet";
import type { DivIcon, DivIconOptions, IconOptions } from "leaflet";

function markerFactory(color: string): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xlink:href", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", "55px");
  svg.setAttribute("height", "40px");
  svg.setAttribute("viewBox", "0 0 9.2604 10.583");
  
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("transform", "translate(-2.5)");

  const markerShadow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  markerShadow.setAttribute("d", "m0.31757 3.7368c-0.02918-4.6722 8.6184-4.8059 8.6184-0.023347 0 2.7644-4.299 6.6951-4.299 6.6951s-4.3004-3.6241-4.3194-6.6718z")
  markerShadow.setAttribute("transform", "skewX(-50) scale(1 0.5) translate(12 10)");
  markerShadow.setAttribute("fill", "#00000050");
  markerShadow.setAttribute("stroke-width", "0");

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "path");
  marker.setAttribute("d", "m0.31757 3.7368c-0.02918-4.6722 8.6184-4.8059 8.6184-0.023347 0 2.7644-4.299 6.6951-4.299 6.6951s-4.3004-3.6241-4.3194-6.6718z")
  marker.setAttribute("fill", color);
  marker.setAttribute("stroke-width", "0");
  
  group.appendChild(markerShadow);
  group.appendChild(marker);

  svg.appendChild(group);
  return svg
}

function addMarkerNumber(
  markerNumber: number,
  color: string,
): HTMLElement {
  const div = document.createElement("div");
  div.appendChild(markerFactory(color));

  const markerNumberEle = document.createElement("span");
  markerNumberEle.classList.add('marker-number');
  markerNumberEle.textContent = markerNumber.toString();
  div.prepend(markerNumberEle);

  return div;
}

export function isDivIconConfig(
  config: IconOptions | DivIconOptions
): config is DivIconOptions {
  return "html" in config;
}

export function divIconFactory(
  markerNumber: number,
  color: string,
  options?: DivIconOptions,
): DivIcon {
  return divIcon({
    ...options,
    className: "",
    iconSize: [35, 40],
    iconAnchor: [17.5, 35],
    html: addMarkerNumber(markerNumber, color),
  });
}

