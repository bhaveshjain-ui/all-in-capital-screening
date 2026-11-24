// The portfolio as it can be known from public sources. THIS LIST IS INCOMPLETE.
// The official page lists 18 companies with no dates or fund tags; press names others; Fund II companies are
// only partly named. Descriptions are short paraphrases of what public pages say. Partners should supply the
// full list with former names (the notes show a conflict was nearly missed because nobody had the full list).
// Replace this file with the partners' list when it exists.

export interface PortfolioCompany {
  name: string;
  aliases: string[];
  description: string;
  /** Where the name comes from. */
  basis: "official site" | "press" | "case notes";
}

export const PORTFOLIO_NOTE =
  "Checked against the public list only (18 companies on the fund's site plus others named in press). " +
  "It is incomplete and may omit former names; a clear result here does not mean there is no conflict.";

export const PORTFOLIO: PortfolioCompany[] = [
  { name: "MeetRecord", aliases: ["Outdoo", "Outdoo AI"], basis: "case notes",
    description: "AI call and meeting summaries, CRM-linked insights, call scoring and sales coaching for sales teams (one listing says it is now called Outdoo AI)." },
  { name: "SuperK", aliases: [], basis: "official site",
    description: "Tech-enabled franchised grocery chain for small towns (Andhra Pradesh, planning Telangana and Karnataka): rebrands existing kirana stores and handles supply, pricing and billing." },
  { name: "Wint Wealth", aliases: [], basis: "official site", description: "Retail bond and alternate-debt investing platform." },
  { name: "Jai Kisan", aliases: [], basis: "official site", description: "Rural and agricultural credit platform for farmers and rural households." },
  { name: "Giva", aliases: [], basis: "official site", description: "Online-first jewellery brand (silver, gold, lab-grown diamonds)." },
  { name: "ePlane", aliases: ["The ePlane Company"], basis: "official site", description: "Electric vertical take-off and landing aircraft and unmanned aerial vehicles." },
  { name: "Unbox Robotics", aliases: [], basis: "official site", description: "Robotic package-sorting systems for warehouses." },
  { name: "Rocketlane", aliases: [], basis: "official site", description: "Customer onboarding software." },
  { name: "Mailmodo", aliases: [], basis: "official site", description: "Email marketing platform." },
  { name: "FleetX", aliases: [], basis: "official site", description: "Fleet management software." },
  { name: "Fashinza", aliases: [], basis: "official site", description: "Fashion supply-chain marketplace." },
  { name: "Rigi", aliases: [], basis: "official site", description: "Creator subscription platform." },
  { name: "QuestBook", aliases: [], basis: "official site", description: "Web3 learning platform." },
  { name: "Spiti.xyz", aliases: ["Spiti"], basis: "official site", description: "Software product (listed as SaaS)." },
  { name: "Suitable.ai", aliases: [], basis: "official site", description: "Software product (listed as SaaS)." },
  { name: "Bitespeed", aliases: [], basis: "official site", description: "E-commerce software." },
  { name: "Anar", aliases: [], basis: "official site", description: "B2B business network." },
  { name: "RevenueHero", aliases: [], basis: "official site", description: "Sales tooling." },
  { name: "Magma", aliases: [], basis: "press", description: "Named in press as a portfolio company; business not described in the sources read." },
  { name: "Volt Money", aliases: [], basis: "press", description: "Named in press (an aggregator lists it as an exit); lending-related." },
  { name: "SuprSend", aliases: [], basis: "press", description: "Named in press; notification infrastructure software." },
  { name: "CommandK", aliases: [], basis: "press", description: "Named in press; business not described in the sources read." },
  { name: "Produze", aliases: [], basis: "press", description: "Named in press; business not described in the sources read." },
  { name: "Vaaree", aliases: [], basis: "press", description: "Home and lifestyle e-commerce brand (named in press)." },
  { name: "NewMe", aliases: [], basis: "press", description: "Named among the fund's founder stories; business not described in the sources read." },
  { name: "PierSight", aliases: ["PierSight Space"], basis: "press", description: "Space-technology company (named in press)." },
  { name: "Broccoli AI", aliases: [], basis: "official site", description: "Named among the fund's founder stories; business not described in the sources read." },
  { name: "Taakat", aliases: [], basis: "press", description: "Mass-market FMCG brand (Fund II, named in press)." },
  { name: "MedMitra", aliases: [], basis: "press", description: "AI co-pilot for doctors (Fund II, named in press)." },
  { name: "Spill Games", aliases: [], basis: "press", description: "Mobile gaming studio (Fund II, named in press)." },
  { name: "Krrvy", aliases: [], basis: "press", description: "Shapewear and lingerie brand (Fund II, named in press)." },
  { name: "Mixar", aliases: [], basis: "press", description: "AI 3D modelling and animation (Fund II, named in press)." },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Portfolio names or aliases that appear in the text. Mentions are rare; overlap is usually unstated. */
export function findMentions(text: string, list: PortfolioCompany[] = PORTFOLIO): string[] {
  const out: string[] = [];
  for (const c of list) {
    const names = [c.name, ...c.aliases];
    if (names.some((n) => new RegExp(`(^|[^A-Za-z0-9])${escape(n)}($|[^A-Za-z0-9])`, "i").test(text))) out.push(c.name);
  }
  return out;
}
