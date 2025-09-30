import { LatLng, Icon } from "leaflet";
import { FC } from "react";
import { TileLayer as LeafletTileLayer, useMapEvent } from "react-leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix bundling of icons other than the default
Icon.Default.mergeOptions({
  iconRetinaUrl,
  shadowUrl,
});

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
