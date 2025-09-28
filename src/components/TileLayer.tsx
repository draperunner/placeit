import { LatLng } from "leaflet";
import { FC } from "react";
import { TileLayer as LeafletTileLayer, useMapEvent } from "react-leaflet";

type Props = {
  attribution: string;
  url: string;
  onMapClick?: (latlng: LatLng) => void;
};

export const TileLayer: FC<Props> = ({ attribution, url, onMapClick }) => {
  useMapEvent("click", (event) => {
    onMapClick?.(event.latlng);
  });

  return <LeafletTileLayer attribution={attribution} url={url} noWrap />;
};
