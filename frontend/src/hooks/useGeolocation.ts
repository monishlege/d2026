import { useCallback, useEffect, useMemo, useState } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  state: string;
  district: string;
}

export interface GeolocationHookState {
  coordinates: Coordinates | null;
  location: LocationState | null;
  status: "idle" | "requesting" | "resolved" | "denied" | "error";
  error: string | null;
  isManualOverride: boolean;
}

export interface GeolocationHook extends GeolocationHookState {
  requestLocation: () => void;
  setManualLocation: (location: LocationState) => void;
  resetLocation: () => void;
}

const INDIAN_STATES_DISTRICTS: Record<string, string[]> = {
  "All-India": ["National Capital Region"],
  "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi"],
  "Maharashtra": ["Mumbai City", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Prayagraj", "Varanasi", "Agra"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "Punjab": ["Ludhiana", "Amritsar", "Chandigarh", "Patiala"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
  "Chhattisgarh": ["Raipur", "Bilaspur", "Durg"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Hisar"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Tirupati"],
};

export const INDIAN_STATES = Object.keys(INDIAN_STATES_DISTRICTS).filter((s) => s !== "All-India");

export function getDistrictsForState(state: string): string[] {
  return INDIAN_STATES_DISTRICTS[state] ?? [];
}

const COORDINATE_RANGES: Array<{
  state: string;
  district: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}> = [
  { state: "Karnataka", district: "Bengaluru Urban", latMin: 12.8, latMax: 13.2, lonMin: 77.4, lonMax: 77.8 },
  { state: "Karnataka", district: "Mysuru", latMin: 12.2, latMax: 12.4, lonMin: 76.5, lonMax: 76.8 },
  { state: "Karnataka", district: "Mangaluru", latMin: 12.8, latMax: 13.0, lonMin: 74.8, lonMax: 75.0 },
  { state: "Maharashtra", district: "Mumbai City", latMin: 18.9, latMax: 19.2, lonMin: 72.7, lonMax: 73.0 },
  { state: "Maharashtra", district: "Pune", latMin: 18.4, latMax: 18.7, lonMin: 73.7, lonMax: 74.0 },
  { state: "Tamil Nadu", district: "Chennai", latMin: 12.9, latMax: 13.2, lonMin: 80.1, lonMax: 80.4 },
  { state: "Tamil Nadu", district: "Coimbatore", latMin: 10.8, latMax: 11.1, lonMin: 76.8, lonMax: 77.1 },
  { state: "Telangana", district: "Hyderabad", latMin: 17.2, latMax: 17.6, lonMin: 78.3, lonMax: 78.6 },
  { state: "Uttar Pradesh", district: "Lucknow", latMin: 26.7, latMax: 27.1, lonMin: 80.8, lonMax: 81.2 },
  { state: "Uttar Pradesh", district: "Varanasi", latMin: 25.2, latMax: 25.5, lonMin: 82.9, lonMax: 83.2 },
  { state: "West Bengal", district: "Kolkata", latMin: 22.4, latMax: 22.7, lonMin: 88.2, lonMax: 88.5 },
  { state: "Gujarat", district: "Ahmedabad", latMin: 22.9, latMax: 23.2, lonMin: 72.4, lonMax: 72.7 },
  { state: "Rajasthan", district: "Jaipur", latMin: 26.7, latMax: 27.0, lonMin: 75.7, lonMax: 76.0 },
  { state: "Punjab", district: "Ludhiana", latMin: 30.7, latMax: 31.0, lonMin: 75.7, lonMax: 76.0 },
  { state: "Bihar", district: "Patna", latMin: 25.5, latMax: 25.8, lonMin: 85.0, lonMax: 85.3 },
  { state: "Kerala", district: "Thiruvananthapuram", latMin: 8.4, latMax: 8.6, lonMin: 76.8, lonMax: 77.1 },
  { state: "Assam", district: "Guwahati", latMin: 26.0, latMax: 26.3, lonMin: 91.6, lonMax: 91.9 },
  { state: "Andhra Pradesh", district: "Visakhapatnam", latMin: 17.6, latMax: 17.9, lonMin: 83.1, lonMax: 83.4 },
  { state: "Haryana", district: "Gurugram", latMin: 28.3, latMax: 28.6, lonMin: 76.9, lonMax: 77.2 },
  { state: "Madhya Pradesh", district: "Bhopal", latMin: 23.1, latMax: 23.4, lonMin: 77.3, lonMax: 77.6 },
];

function reverseGeocodeMock(coords: Coordinates): LocationState | null {
  for (const range of COORDINATE_RANGES) {
    if (
      coords.latitude >= range.latMin &&
      coords.latitude <= range.latMax &&
      coords.longitude >= range.lonMin &&
      coords.longitude <= range.lonMax
    ) {
      return { state: range.state, district: range.district };
    }
  }

  if (coords.latitude >= 6.75 && coords.latitude <= 35.5 && coords.longitude >= 68.0 && coords.longitude <= 97.5) {
    return { state: "All-India", district: "National Capital Region" };
  }

  return null;
}

const LS_KEY_LOCATION_OVERRIDE = "jansahayak.location.override";

export function useGeolocation(autoRequest = true): GeolocationHook {
  const [state, setState] = useState<GeolocationHookState>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_LOCATION_OVERRIDE);
      if (raw) {
        const parsed = JSON.parse(raw) as LocationState;
        return {
          coordinates: null,
          location: parsed,
          status: "resolved",
          error: null,
          isManualOverride: true,
        };
      }
    } catch {
      /* ignore corrupt value */
    }
    return {
      coordinates: null,
      location: null,
      status: "idle",
      error: null,
      isManualOverride: false,
    };
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((prev) => ({ ...prev, status: "error", error: "Geolocation is not supported by your browser." }));
      return;
    }

    setState((prev) => ({ ...prev, status: "requesting", error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const resolved = reverseGeocodeMock(coords);
        if (resolved) {
          localStorage.removeItem(LS_KEY_LOCATION_OVERRIDE);
          setState({
            coordinates: coords,
            location: resolved,
            status: "resolved",
            error: null,
            isManualOverride: false,
          });
        } else {
          setState({
            coordinates: coords,
            location: null,
            status: "denied",
            error: "Could not resolve your location. Please select manually.",
            isManualOverride: false,
          });
        }
      },
      (geolocationError) => {
        let message = "Location request failed. Please select manually.";
        switch (geolocationError.code) {
          case 1:
            message = "Location permissions denied. Please enable location or select your area manually.";
            break;
          case 2:
            message = "Position unavailable. Please check device settings or select manually.";
            break;
          case 3:
            message = "Location request timed out. Please try again or select manually.";
            break;
        }
        setState((prev) => ({
          ...prev,
          coordinates: null,
          status: "denied",
          error: message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const setManualLocation = useCallback((location: LocationState) => {
    try {
      localStorage.setItem(LS_KEY_LOCATION_OVERRIDE, JSON.stringify(location));
    } catch {
      /* ignore persistence errors */
    }
    setState({
      coordinates: null,
      location,
      status: "resolved",
      error: null,
      isManualOverride: true,
    });
  }, []);

  const resetLocation = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY_LOCATION_OVERRIDE);
    } catch {
      /* ignore */
    }
    setState({
      coordinates: null,
      location: null,
      status: "idle",
      error: null,
      isManualOverride: false,
    });
  }, []);

  useEffect(() => {
    if (autoRequest && state.status === "idle") {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest, state.status]);

  return useMemo(() => ({ ...state, requestLocation, setManualLocation, resetLocation }), [
    state,
    requestLocation,
    setManualLocation,
    resetLocation,
  ]);
}
