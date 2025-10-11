import { FC } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { Feature, Polygon as GeoJSONPolygon } from "geojson";

type Props = {
  feature: Feature<GeoJSONPolygon>;
};

export const Polygon: FC<Props> = ({ feature }) => {
  return (
    <Source type="geojson" data={feature}>
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
