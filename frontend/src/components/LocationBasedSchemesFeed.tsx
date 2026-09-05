import { useMemo, useState } from "react";
import { ChevronDown, MapPin, RefreshCw, ShieldCheck, Sparkles, Tractor, Stethoscope, Landmark, Building2, Sprout, Heart, Bus, GraduationCap, HomeIcon } from "lucide-react";

import { getDistrictsForState, INDIAN_STATES, useGeolocation, type GeolocationHook, type LocationState } from "@/hooks/useGeolocation";
import type { LocatedScheme, SchemeScope } from "@/types";
import { scanUrl } from "@/utils/api";

export const LOCATED_SCHEMES: LocatedScheme[] = [
  {
    name: "PM-KISAN Samman Nidhi",
    description: "Income support of Rs. 6,000 per year to all landholding farmer families across India in three equal instalments.",
    benefit_summary: "Rs. 6,000 per year | 3 equal instalments",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Farmers", "Income Support", "DBT"],
    applyUrl: "https://pmkisan.gov.in/",
  },
  {
    name: "Ayushman Bharat - PMJAY",
    description: "Free health insurance cover of up to Rs. 5 lakh per family per year for secondary and tertiary care hospitalization.",
    benefit_summary: "Rs. 5 lakh / family / year | 10.74 cr families",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Health", "Insurance", "BPL Families"],
    applyUrl: "https://pmjay.gov.in/",
  },
  {
    name: "e-SHRAM Portal",
    description: "National database of unorganised workers with accidental insurance coverage of Rs. 2 lakh on registration.",
    benefit_summary: "Rs. 2 lakh insurance | UAN for workers",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Workers", "Unorganised", "Social Security"],
    applyUrl: "https://eshram.gov.in/",
  },
  {
    name: "PM Awas Yojana (PMAY-G)",
    description: "Assistance of Rs. 1.2 lakh (plain areas) to Rs. 1.3 lakh (hilly areas) for construction of pucca houses to eligible rural households.",
    benefit_summary: "Rs. 1.2-1.3 lakh assistance + 90/95 days wage support",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Housing", "Rural", "BPL Families"],
  },
  {
    name: "MGNREGA",
    description: "Guarantee of 100 days of wage employment in a financial year to every rural household whose adult members volunteer to do unskilled manual work.",
    benefit_summary: "100 days wage employment | Minimum wage notified",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Employment", "Rural", "Workers"],
  },
  {
    name: "PM Ujjwala Yojana 2.0",
    description: "Free LPG connection to women of low-income families with financial assistance of Rs. 1,600 per connection plus first refill and stove.",
    benefit_summary: "Free LPG connection + subsidy support",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Women", "Energy", "Cooking Gas"],
  },
  {
    name: "PM Garib Kalyan Anna Yojana (PMGKAY)",
    description: "Distribution of 5 kg of food grains per person per month free of cost to all NFSA beneficiaries covered under Antyodaya and Priority households.",
    benefit_summary: "5 kg free food grains / person / month",
    scope: "national",
    state: null,
    districts: null,
    tags: ["Food Security", "BPL Families", "Nutrition"],
  },
  {
    name: "Nirman Aadhaar Shramik Yojana",
    description: "Maharashtra: Financial aid up to Rs. 10,000, accidental death cover and medical assistance for registered construction workers.",
    benefit_summary: "Rs. 10,000 aid + Insurance benefits",
    scope: "state",
    state: "Maharashtra",
    districts: null,
    tags: ["Construction Workers", "State Scheme"],
  },
  {
    name: "Karnataka Raita Vidya Nidhi",
    description: "Karnataka: Educational scholarship assistance to children of farmers pursuing higher studies (pre-matric to post-graduation) to reduce dropout rates.",
    benefit_summary: "Rs. 2,500 - Rs. 11,000 per year per student",
    scope: "state",
    state: "Karnataka",
    districts: null,
    tags: ["Education", "Farmers' Children", "Karnataka"],
  },
  {
    name: "Karnataka Gruha Jyothi",
    description: "Karnataka: Free electricity up to 200 units per month for every domestic household consuming below 201 units.",
    benefit_summary: "Free 200 units electricity | All domestic households",
    scope: "state",
    state: "Karnataka",
    districts: null,
    tags: ["Electricity", "Domestic", "Karnataka"],
  },
  {
    name: "Karnataka Gruha Lakshmi",
    description: "Karnataka: Monthly assistance of Rs. 2,000 to the woman head of every household below the poverty line via direct benefit transfer.",
    benefit_summary: "Rs. 2,000 / month per woman head of family",
    scope: "state",
    state: "Karnataka",
    districts: null,
    tags: ["Women", "Income Support", "Karnataka"],
  },
  {
    name: "Tamil Nadu Kalaignar Magalir Urimai Thogai",
    description: "Tamil Nadu: Rs. 1,000 per month as entitlement income to women heads of eligible households across all districts.",
    benefit_summary: "Rs. 1,000 / month to eligible women",
    scope: "state",
    state: "Tamil Nadu",
    districts: null,
    tags: ["Women", "Universal Income", "Tamil Nadu"],
  },
  {
    name: "Tamil Nadu Chief Minister's Comprehensive Health Insurance",
    description: "Tamil Nadu: Free surgical and medical cover of Rs. 5 lakh per year to families of earning less than Rs. 72,000 per annum.",
    benefit_summary: "Rs. 5 lakh health cover per family / year",
    scope: "state",
    state: "Tamil Nadu",
    districts: null,
    tags: ["Health", "Insurance", "Tamil Nadu"],
  },
  {
    name: "Telangana Rythu Bandhu",
    description: "Telangana: Investment support of Rs. 10,000 per acre per year (Rs. 5,000 per acre per crop season) for all farmers and landowners.",
    benefit_summary: "Rs. 10,000 per acre / year (2 seasons)",
    scope: "state",
    state: "Telangana",
    districts: null,
    tags: ["Farmers", "Agriculture", "Telangana"],
  },
  {
    name: "Telangana Dalit Bandhu",
    description: "Telangana: One-time grant of Rs. 10 lakh per eligible SC / ST family as seed capital for income-generating self-employment ventures.",
    benefit_summary: "Rs. 10 lakh one-time direct grant per family",
    scope: "state",
    state: "Telangana",
    districts: null,
    tags: ["SC/ST", "Self Employment", "Telangana"],
  },
  {
    name: "Bihar Chief Minister Student Credit Card",
    description: "Bihar: Education loans up to Rs. 4 lakh at 4% simple interest (1% for girls) for students pursuing higher education after Class 12.",
    benefit_summary: "Up to Rs. 4 lakh education loan @ 4% p.a.",
    scope: "state",
    state: "Bihar",
    districts: null,
    tags: ["Education", "Students", "Bihar"],
  },
  {
    name: "Uttar Pradesh Kanya Sumangala Yojana",
    description: "Uttar Pradesh: Financial assistance in instalments totalling Rs. 15,000 to a girl child from birth to completion of Class 12.",
    benefit_summary: "Rs. 15,000 in stages per girl child",
    scope: "state",
    state: "Uttar Pradesh",
    districts: null,
    tags: ["Girl Child", "Education", "Uttar Pradesh"],
  },
  {
    name: "West Bengal Lakshmir Bhandar",
    description: "West Bengal: Monthly income support of Rs. 1,000 (general) and Rs. 1,250 (SC/ST families) to the female head of family.",
    benefit_summary: "Rs. 1,000 - Rs. 1,250 per month",
    scope: "state",
    state: "West Bengal",
    districts: null,
    tags: ["Women", "Income Support", "West Bengal"],
  },
  {
    name: "Kerala Karunya Benevolent Fund",
    description: "Kerala: Financial assistance for treatment of catastrophic illnesses to patients from economically weaker sections with more than 50% medical expense cover.",
    benefit_summary: "Up to Rs. 3 lakh treatment assistance",
    scope: "state",
    state: "Kerala",
    districts: null,
    tags: ["Health", "Poor Patients", "Kerala"],
  },
  {
    name: "Rajasthan Mukhyamantri Chiranjeevi Swasthya Bima",
    description: "Rajasthan: Universal free health insurance of up to Rs. 10 lakh per family per year for every resident family registered on Jan Aadhaar card.",
    benefit_summary: "Rs. 10 lakh universal health cover",
    scope: "state",
    state: "Rajasthan",
    districts: null,
    tags: ["Health", "Universal Insurance", "Rajasthan"],
  },
  {
    name: "Gujarat Garib Kalyan Mela Assistance",
    description: "Gujarat: Combined benefits including financial aid, housing, equipment and scheme linkages to BPL families delivered through mega melas.",
    benefit_summary: "Aid up to Rs. 1.4 lakh depending on profile",
    scope: "state",
    state: "Gujarat",
    districts: null,
    tags: ["Assistance", "BPL", "Gujarat"],
  },
  {
    name: "Punjab Atta-Dal Scheme",
    description: "Punjab: 6 kg wheat and 1 kg pulses per month per beneficiary at highly subsidised rates (Rs. 1 per kg) to all Blue-Card, Atta-Dal and Antyodaya families.",
    benefit_summary: "Subsidised 6kg wheat + 1kg dal / month",
    scope: "state",
    state: "Punjab",
    districts: null,
    tags: ["Food Security", "BPL", "Punjab"],
  },
  {
    name: "Assam Orunodoi 2.0",
    description: "Assam: Direct financial assistance of Rs. 1,250 per month to the female nominee of eligible families from economically weaker sections.",
    benefit_summary: "Rs. 1,250 / month per family",
    scope: "state",
    state: "Assam",
    districts: null,
    tags: ["Women", "Income Support", "Assam"],
  },
  {
    name: "Jharkhand Mukhyamantri Shramik Yojana",
    description: "Jharkhand: Guarantee of 100 days of wage employment per year to poor urban unemployed youth and workers at notified urban work sites.",
    benefit_summary: "100 days guaranteed wage employment (urban)",
    scope: "state",
    state: "Jharkhand",
    districts: null,
    tags: ["Urban Employment", "Workers", "Jharkhand"],
  },
  {
    name: "Bruhat Bengaluru Special Development Package",
    description: "Karnataka, Bengaluru Urban: Enhanced civic works, subsidised transport passes, housing cluster grants and skill-upgradation programmes for BBMP workers.",
    benefit_summary: "Civic works + transport + housing + skilling grants",
    scope: "district",
    state: "Karnataka",
    districts: ["Bengaluru Urban"],
    tags: ["Bengaluru", "Urban", "Workers"],
  },
  {
    name: "Mumbai Unorganised Labour Board Assistance",
    description: "Maharashtra, Mumbai City: Special ID card, accident cover, school kit assistance for children and free medical camps for unorganised sector workers.",
    benefit_summary: "Rs. 2 lakh accident cover + child education aid",
    scope: "district",
    state: "Maharashtra",
    districts: ["Mumbai City"],
    tags: ["Mumbai", "Unorganised Workers"],
  },
  {
    name: "Chennai Smart City Vaanavil Housing Scheme",
    description: "Tamil Nadu, Chennai: Affordable housing units with EWS / LIG clusters, subsidised EMIs and free UGD, water and road infrastructure.",
    benefit_summary: "Subsidised housing + infrastructure amenities",
    scope: "district",
    state: "Tamil Nadu",
    districts: ["Chennai"],
    tags: ["Chennai", "Affordable Housing"],
  },
  {
    name: "Hyderabad GHMC Old Age Homes + Pension",
    description: "Telangana, Hyderabad: Enhanced old-age pension of Rs. 2,500 and priority access to GHMC-operated shelter homes for eligible senior citizens.",
    benefit_summary: "Rs. 2,500 / month + shelter home access",
    scope: "district",
    state: "Telangana",
    districts: ["Hyderabad"],
    tags: ["Hyderabad", "Senior Citizens", "Pension"],
  },
];

const SCOPE_ICONS: Record<SchemeScope, typeof Tractor> = {
  national: Landmark,
  state: Building2,
  district: HomeIcon,
};

const TAG_ICONS: Record<string, typeof Tractor> = {
  Farmers: Tractor,
  Agriculture: Tractor,
  Health: Stethoscope,
  Insurance: ShieldCheck,
  Education: GraduationCap,
  Housing: HomeIcon,
  Employment: Bus,
  Workers: Sparkles,
  Nutrition: Sprout,
  Women: Heart,
};

function formatScopeBadge(scheme: LocatedScheme): { label: string; style: string } {
  if (scheme.scope === "national") {
    return { label: "All-India", style: "border-orange-300/30 bg-orange-300/10 text-orange-100" };
  }
  if (scheme.scope === "state") {
    return {
      label: `State: ${scheme.state}`,
      style: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    };
  }
  return {
    label: `District: ${scheme.districts?.[0] ?? scheme.state ?? ""}`,
    style: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
  };
}

interface LocationBasedSchemesFeedProps {
  onCheckEligibility?: (scheme: LocatedScheme) => void;
  geo?: GeolocationHook;
}

export function getLocatedSchemes(location: LocationState | null): LocatedScheme[] {
  if (!location) return LOCATED_SCHEMES.filter((scheme) => scheme.scope === "national");
  return LOCATED_SCHEMES.filter((scheme) => {
    if (scheme.scope === "national") return true;
    if (scheme.scope === "state") return scheme.state === location.state;
    return scheme.state === location.state && (scheme.districts?.includes(location.district) ?? false);
  });
}

export default function LocationBasedSchemesFeed({ onCheckEligibility, geo: externalGeo }: LocationBasedSchemesFeedProps) {
  const localGeo = useGeolocation(!externalGeo);
  const geo = externalGeo ?? localGeo;
  const [scanningUrl, setScanningUrl] = useState<string | null>(null);

  const filteredSchemes = useMemo(() => {
    return getLocatedSchemes(geo.location);
  }, [geo.location]);

  async function handleApplyClick(scheme: LocatedScheme) {
    if (!scheme.applyUrl) {
      onCheckEligibility?.(scheme);
      return;
    }

    setScanningUrl(scheme.applyUrl);
    try {
      const result = await scanUrl(scheme.applyUrl);
      if (!result.safe || !result.official_portal_match) {
        window.alert("This link failed the Security Dashboard scan and was blocked from redirecting to an unverified portal.");
        setScanningUrl(null);
        return;
      }
      window.open(scheme.applyUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.alert("The portal security check could not complete. Redirect was blocked for safety.");
    } finally {
      setScanningUrl(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Location feed</p>
          <h2 className="mt-2 font-display text-4xl text-white">Schemes tailored to {geo.location?.district ?? "your area"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Automatically surfaces national flagship programmes alongside state and district level schemes.
            Deny location permissions? Use the manual selector below to pick your state and district.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 md:w-[420px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-2xl bg-cyan-300/10 p-2 text-cyan-100">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {geo.isManualOverride ? "Manual selection" : "Live geolocation"}
                </p>
                <p className="text-sm font-semibold text-white">
                  {geo.location
                    ? `${geo.location.district}, ${geo.location.state}`
                    : geo.status === "requesting"
                      ? "Resolving coordinates…"
                      : geo.status === "error" || geo.status === "denied"
                        ? "Location unavailable"
                        : "Requesting location…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={geo.requestLocation}
              disabled={geo.status === "requesting"}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Refresh geolocation"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${geo.status === "requesting" ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="location-state" className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                State / UT
              </label>
              <div className="relative">
                <select
                  id="location-state"
                  value={geo.location?.state ?? ""}
                  onChange={(event) => {
                    const state = event.target.value;
                    if (!state) {
                      geo.resetLocation();
                      return;
                    }
                    const districts = getDistrictsForState(state);
                    geo.setManualLocation({ state, district: districts[0] ?? state });
                  }}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-cyan-300/50"
                >
                  <option value="" className="bg-slate-950">Auto detect…</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state} className="bg-slate-950">
                      {state}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="location-district" className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                District
              </label>
              <div className="relative">
                <select
                  id="location-district"
                  value={geo.location?.district ?? ""}
                  disabled={!geo.location?.state || geo.location.state === "All-India"}
                  onChange={(event) => {
                    const district = event.target.value;
                    const state = geo.location?.state;
                    if (state && district) {
                      geo.setManualLocation({ state, district });
                    }
                  }}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" className="bg-slate-950">—</option>
                  {geo.location?.state
                    ? getDistrictsForState(geo.location.state).map((district) => (
                        <option key={district} value={district} className="bg-slate-950">
                          {district}
                        </option>
                      ))
                    : null}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {geo.error ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
              {geo.error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em]">
            <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">
              National · {LOCATED_SCHEMES.filter((s) => s.scope === "national").length}
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
              State · {LOCATED_SCHEMES.filter((s) => s.scope === "state").length}
            </span>
            <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-fuchsia-100">
              District · {LOCATED_SCHEMES.filter((s) => s.scope === "district").length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
              Showing {filteredSchemes.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSchemes.map((scheme) => {
          const ScopeIcon = SCOPE_ICONS[scheme.scope];
          const badge = formatScopeBadge(scheme);
          const fallbackIcon = SCOPE_ICONS[scheme.scope];
          const firstIconKey = scheme.tags.find((t) => TAG_ICONS[t]) ?? scheme.tags[0];
          const TagIcon = TAG_ICONS[firstIconKey] ?? fallbackIcon;

          return (
            <article
              key={`${scheme.name}-${scheme.state ?? "national"}`}
              className="group relative flex flex-col rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex rounded-2xl bg-cyan-300/10 p-3 text-cyan-100">
                  <TagIcon className="h-5 w-5" />
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${badge.style}`}>
                  <ScopeIcon className="h-3 w-3" />
                  {badge.label}
                </span>
              </div>

              <h3 className="mt-4 font-display text-2xl leading-tight text-white">{scheme.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">{scheme.description}</p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-orange-200/70">Benefit summary</p>
                <p className="mt-1 text-sm font-semibold text-orange-100">{scheme.benefit_summary}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {scheme.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCheckEligibility?.(scheme)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Check eligibility
                </button>
                {scheme.applyUrl ? (
                  <button
                    type="button"
                    onClick={() => void handleApplyClick(scheme)}
                    disabled={scanningUrl === scheme.applyUrl}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-orange-300/40 bg-orange-300/10 px-4 py-2.5 text-sm font-semibold text-orange-100 transition hover:bg-orange-300/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {scanningUrl === scheme.applyUrl ? "Scanning…" : "Apply ↗"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCheckEligibility?.(scheme)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:border-orange-300/40 hover:bg-white/10"
                  >
                    Learn more
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
