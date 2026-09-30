/**
 * Browser-safe FixRight configuration.
 * Only publishable values belong here.
 */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] ??
  "pk_test_aW4taW1wYWxhLTc1NDEuY2xlcmsuYWNjb3VudHMuZGV2JA";

export const DEMO_SERVICE_FEE_NGN = 1000;

export const SERVICE_FEE_NOTE =
  "The ₦1,000 service fee covers the technician's visit and diagnosis only. Repair labour beyond diagnosis and replacement parts are charged separately.";

export const APP_NAME = "FixRight";
