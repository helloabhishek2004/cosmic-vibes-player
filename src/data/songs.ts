export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  year: number;
  genre: string[];
  thumbnailUrl: string;
};

export const songs: Song[] = [
  { id: "1", title: "Midnight Drive", artist: "Lunar Echo", album: "Neon Skylines", duration: "3:42", year: 2023, genre: ["Synthwave", "Electronic"], thumbnailUrl: "https://picsum.photos/seed/1/600/600" },
  { id: "2", title: "Velvet Sunrise", artist: "Aria Vale", album: "Golden Hour", duration: "4:15", year: 2024, genre: ["Indie Pop", "Dream Pop"], thumbnailUrl: "https://picsum.photos/seed/2/600/600" },
  { id: "3", title: "Concrete Jungle", artist: "Marcus King", album: "City Lights", duration: "3:28", year: 2022, genre: ["Hip Hop", "R&B"], thumbnailUrl: "https://picsum.photos/seed/3/600/600" },
  { id: "4", title: "Ocean Drift", artist: "Sable Coast", album: "Tides", duration: "5:02", year: 2023, genre: ["Ambient", "Chillout"], thumbnailUrl: "https://picsum.photos/seed/4/600/600" },
  { id: "5", title: "Electric Heart", artist: "Nova Pulse", album: "Voltage", duration: "3:11", year: 2024, genre: ["EDM", "House"], thumbnailUrl: "https://picsum.photos/seed/5/600/600" },
  { id: "6", title: "Paper Planes", artist: "The Wildwoods", album: "Folktales", duration: "3:54", year: 2021, genre: ["Folk", "Acoustic"], thumbnailUrl: "https://picsum.photos/seed/6/600/600" },
  { id: "7", title: "Crimson Sky", artist: "Vega Romance", album: "Afterglow", duration: "4:33", year: 2024, genre: ["Alt Rock", "Indie"], thumbnailUrl: "https://picsum.photos/seed/7/600/600" },
  { id: "8", title: "Sapphire Dreams", artist: "Kiyoshi", album: "Lo-Fi Nights", duration: "2:48", year: 2023, genre: ["Lo-Fi", "Jazz"], thumbnailUrl: "https://picsum.photos/seed/8/600/600" },
  { id: "9", title: "Phantom Bloom", artist: "Mirage Theory", album: "Echoes", duration: "4:01", year: 2022, genre: ["Synthpop"], thumbnailUrl: "https://picsum.photos/seed/9/600/600" },
  { id: "10", title: "Golden Static", artist: "Halcyon", album: "Static Bloom", duration: "3:36", year: 2024, genre: ["Indie", "Dream Pop"], thumbnailUrl: "https://picsum.photos/seed/10/600/600" },
];
