import { FC } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

type Props = {
  points: {
    longitude: number;
    latitude: number;
  }[];
};

export const LineString: FC<Props> = ({ points }) => {
  return (
    <Source
      type="geojson"
      data={{
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.longitude, p.latitude]),
        },
        properties: {},
      }}
    >
      <Layer
        type="line"
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
        paint={{
          "line-color": "#fff",
          "line-width": 5,
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
