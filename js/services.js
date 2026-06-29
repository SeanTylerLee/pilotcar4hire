const LISTING_SERVICES = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Chase', label: 'Chase' },
  { value: 'HiPole', label: 'Hi-Pole' },
  { value: 'Steereman', label: 'Steereman' },
  { value: 'RouteSurvey', label: 'Route Survey' },
  { value: 'MultipleCars', label: 'Multiple Cars' },
];

function getServiceLabel(value) {
  return LISTING_SERVICES.find((s) => s.value === value)?.label || value;
}

function listingOffersService(listing, serviceCode) {
  if (!serviceCode) return true;
  const data = normalizeListing(listing);
  return (data.services || []).includes(serviceCode);
}
