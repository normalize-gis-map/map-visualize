export type PlaceItem = {
  key: string;
  label: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds?: [[number, number], [number, number]];
};

export const PLACES: PlaceItem[] = [
  {
    key: "thu-duc",
    label: "Thủ Đức",
    center: [106.7537, 10.8491],
    zoom: 12,
    bounds: [
      [106.7, 10.78],
      [106.84, 10.93],
    ],
  },
  {
    key: "binh-thanh",
    label: "Bình Thạnh",
    center: [106.712, 10.8106],
    zoom: 12,
    bounds: [
      [106.68, 10.77],
      [106.76, 10.85],
    ],
  },
  {
    key: "district-1",
    label: "Quận 1",
    center: [106.7009, 10.7769],
    zoom: 13,
    bounds: [
      [106.68, 10.76],
      [106.72, 10.79],
    ],
  },
];
