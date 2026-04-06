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
    center: [106.7615, 10.8495],
    zoom: 12.5,
    bounds: [
      [106.705, 10.785],
      [106.835, 10.915],
    ],
  },
  {
    key: "binh-thanh",
    label: "Bình Thạnh",
    center: [106.712, 10.8106],
    zoom: 13,
    bounds: [
      [106.685, 10.775],
      [106.75, 10.845],
    ],
  },
  {
    key: "district-1",
    label: "Quận 1",
    center: [106.7009, 10.7769],
    zoom: 14,
    bounds: [
      [106.685, 10.765],
      [106.715, 10.79],
    ],
  },
];
