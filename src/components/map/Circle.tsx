import { FC } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import circle from "@turf/circle";
import { point } from "@turf/helpers";

type Props = {
  coordinates: {
    longitude: number;
    latitude: number;
  };
  radius: number;
};

export const Circle: FC<Props> = ({ coordinates, radius }) => {
  const center = circle(
    point([coordinates.longitude, coordinates.latitude]),
    radius,
    {
      units: "meters",
    },
  );

  return (
    <Source type="geojson" data={center}>
      <Layer
        type="fill"
        paint={{
          "fill-color": "#00f",
          "fill-opacity": 0.2,
        }}
      />
      <Layer
        type="line"
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
        paint={{
          "line-color": "#00f",
          "line-width": 2,
        }}
      />
    </Source>
  );
};
