// This file centralizes SHGC correction factors based on ASHRAE data.

// Multipliers for diffuse solar radiation based on window type.
export const SHGC_DIFFUSE_MULTIPLIERS = {
    modern: 0.86,
    standard: 0.88,
    older_double: 0.86,
    historic: 0.90,
    custom: 1.0, // For custom windows, we assume no special coating effect on diffuse radiation
};

// Correction curves for direct (beam) solar radiation based on angle of incidence.
// The keys are angles of incidence in degrees, and values are the correction multipliers.
export const SHGC_DIRECT_CORRECTION_CURVES = {
    modern: { 0: 1.00, 10: 1.00, 20: 1.00, 30: 0.99, 40: 0.97, 50: 0.92, 60: 0.82, 70: 0.62, 80: 0.30, 90: 0.00 },
    standard: { 0: 1.00, 10: 1.00, 20: 1.00, 30: 0.99, 40: 0.97, 50: 0.93, 60: 0.85, 70: 0.68, 80: 0.37, 90: 0.00 },
    older_double: { 0: 1.00, 10: 1.00, 20: 1.00, 30: 0.99, 40: 0.97, 50: 0.92, 60: 0.83, 70: 0.65, 80: 0.34, 90: 0.00 },
    historic: { 0: 1.00, 10: 1.00, 20: 1.00, 30: 0.99, 40: 0.98, 50: 0.95, 60: 0.90, 70: 0.77, 80: 0.48, 90: 0.00 },
    custom: { 0: 1.00, 10: 1.00, 20: 1.00, 30: 0.99, 40: 0.98, 50: 0.95, 60: 0.90, 70: 0.77, 80: 0.48, 90: 0.00 }, // Using historic as a generic fallback for custom
};
