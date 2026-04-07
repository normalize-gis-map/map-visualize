export type PlaceItem = {
  key: string;
  label: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds?: [[number, number], [number, number]];
};

export const PLACES: PlaceItem[] = [
  {
    key: "ho-chi-minh-city",
    label: "TP. Hồ Chí Minh",
    center: [106.7009, 10.7756],
    zoom: 10.8,
    bounds: [
      [106.35, 10.37],
      [107.02, 11.15],
    ],
  },
  {
    key: "thu-duc",
    label: "TP. Thủ Đức",
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
  {
    key: "district-3",
    label: "Quận 3",
    center: [106.6867, 10.7842],
    zoom: 13.6,
  },
  {
    key: "district-4",
    label: "Quận 4",
    center: [106.7042, 10.7589],
    zoom: 13.8,
  },
  {
    key: "district-5",
    label: "Quận 5",
    center: [106.6673, 10.7546],
    zoom: 13.6,
  },
  {
    key: "district-6",
    label: "Quận 6",
    center: [106.6353, 10.7468],
    zoom: 13.5,
  },
  {
    key: "district-7",
    label: "Quận 7",
    center: [106.7219, 10.7342],
    zoom: 13.4,
  },
  {
    key: "district-8",
    label: "Quận 8",
    center: [106.6323, 10.7246],
    zoom: 12.9,
  },
  {
    key: "district-10",
    label: "Quận 10",
    center: [106.6676, 10.7715],
    zoom: 13.8,
  },
  {
    key: "district-11",
    label: "Quận 11",
    center: [106.6478, 10.7648],
    zoom: 13.5,
  },
  {
    key: "district-12",
    label: "Quận 12",
    center: [106.6555, 10.8678],
    zoom: 12.5,
  },
  {
    key: "tan-binh",
    label: "Quận Tân Bình",
    center: [106.6527, 10.803],
    zoom: 13,
  },
  {
    key: "tan-phu",
    label: "Quận Tân Phú",
    center: [106.6266, 10.7915],
    zoom: 13.1,
  },
  {
    key: "phu-nhuan",
    label: "Quận Phú Nhuận",
    center: [106.6796, 10.8006],
    zoom: 14,
  },
  {
    key: "go-vap",
    label: "Quận Gò Vấp",
    center: [106.6653, 10.8389],
    zoom: 12.9,
  },
  {
    key: "binh-tan",
    label: "Quận Bình Tân",
    center: [106.6023, 10.7653],
    zoom: 12.6,
  },
  {
    key: "hoc-mon",
    label: "Huyện Hóc Môn",
    center: [106.5844, 10.8838],
    zoom: 12.1,
  },
  {
    key: "cu-chi",
    label: "Huyện Củ Chi",
    center: [106.4937, 10.9735],
    zoom: 10.8,
  },
  {
    key: "binh-chanh",
    label: "Huyện Bình Chánh",
    center: [106.5884, 10.6919],
    zoom: 11.7,
  },
  {
    key: "nha-be",
    label: "Huyện Nhà Bè",
    center: [106.7327, 10.6761],
    zoom: 12.1,
  },
  {
    key: "can-gio",
    label: "Huyện Cần Giờ",
    center: [106.9152, 10.4115],
    zoom: 10.4,
  },
];
