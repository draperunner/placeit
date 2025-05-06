import * as blobs2 from "blobs/v2";

interface Props extends blobs2.BlobOptions {
  className?: string;
  color?: string;
}

export default function Blob({
  className,
  color = "#00d084",
  ...blobOptions
}: Props) {
  const pathData = blobs2.svgPath(blobOptions);

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={pathData} fill={color} />
    </svg>
  );
}
