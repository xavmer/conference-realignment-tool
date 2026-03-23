"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

type TeamMapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
};

type Props = {
  teams: TeamMapPoint[];
  onMapClick?: (lat: number, lng: number) => void;
};

export default function ConferenceMap({ teams, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.8, -98.5],
      zoom: 4,
      minZoom: 3,
      maxZoom: 9,
      scrollWheelZoom: true,
      zoomControl: false,
    });

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;

    const clickHandler = (event: L.LeafletMouseEvent) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    };

    map.on("click", clickHandler);
    return () => {
      map.off("click", clickHandler);
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!layerRef.current) return;

    const layer = layerRef.current;
    layer.clearLayers();

    for (const team of teams) {
      L.circleMarker([team.lat, team.lng], {
        radius: 9,
        color: "#eff6ff",
        fillColor: team.color,
        fillOpacity: 0.95,
        weight: 2,
      })
        .bindTooltip(team.name, {
          className: "conference-map-tooltip",
          direction: "top",
          opacity: 0.98,
          offset: [0, -6],
        })
        .addTo(layer);
    }
  }, [teams]);

  return <div ref={containerRef} className="h-full w-full" />;
}
