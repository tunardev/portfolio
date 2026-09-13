export type Paper = {
  title: string;
  year: number;
  href: string;
  width: number;
  height: number;
  face: string;
  ink: string;
  darkCover?: boolean;
  leaning?: boolean;
};

export const shelf: Paper[] = [
  {
    title: "The Google File System",
    year: 2003,
    href: "https://research.google/pubs/the-google-file-system/",
    width: 52,
    height: 214,
    face: "linear-gradient(90deg,#DCC776 0%,#E9D68C 30%,#E4CF83 100%)",
    ink: "#2E2914",
  },
  {
    title: "MapReduce",
    year: 2004,
    href: "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/",
    width: 44,
    height: 194,
    face: "linear-gradient(90deg,#1A1918 0%,#2C2B29 35%,#232220 100%)",
    ink: "#F4F2ED",
    darkCover: true,
  },
  {
    title: "Time, Clocks, Ordering",
    year: 1978,
    href: "https://lamport.azurewebsites.net/pubs/time-clocks.pdf",
    width: 56,
    height: 222,
    face: "linear-gradient(90deg,#AFC39D 0%,#C6D6B4 30%,#BFCFAC 100%)",
    ink: "#1F2A16",
  },
  {
    title: "Raft",
    year: 2014,
    href: "https://raft.github.io/raft.pdf",
    width: 40,
    height: 184,
    face: "linear-gradient(90deg,#F3EFE5 0%,#FBF8F1 35%,#F4F0E6 100%)",
    ink: "#1A1917",
  },
  {
    title: "Spanner",
    year: 2012,
    href: "https://research.google/pubs/spanner-googles-globally-distributed-database-2/",
    width: 58,
    height: 210,
    face: "linear-gradient(90deg,#8FAFD6 0%,#ACC6E6 30%,#A3BFE1 100%)",
    ink: "#152238",
  },
  {
    title: "Bigtable",
    year: 2006,
    href: "https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/",
    width: 36,
    height: 178,
    face: "linear-gradient(90deg,#6B6760 0%,#807B73 35%,#736E66 100%)",
    ink: "#F4F2ED",
    darkCover: true,
  },
  {
    title: "Scaling Laws for Neural LMs",
    year: 2020,
    href: "https://arxiv.org/abs/2001.08361",
    width: 54,
    height: 218,
    face: "linear-gradient(90deg,#E6DDC2 0%,#F0E8D0 30%,#EAE1C8 100%)",
    ink: "#2E2914",
  },
  {
    title: "Dynamo",
    year: 2007,
    href: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
    width: 42,
    height: 192,
    face: "linear-gradient(90deg,#1F1E1D 0%,#33322F 35%,#282725 100%)",
    ink: "#F4F2ED",
    darkCover: true,
  },
  {
    title: "Attention Is All You Need",
    year: 2017,
    href: "https://arxiv.org/abs/1706.03762",
    width: 46,
    height: 200,
    face: "linear-gradient(90deg,#C63A25 0%,#DC4A33 35%,#D04330 100%)",
    ink: "#FFF3EE",
    darkCover: true,
    leaning: true,
  },
];
