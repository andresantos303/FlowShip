// Helper function to calculate delivery dates
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const getDeliveryDate = (daysToAdd: number): string => {
  return new Date(Date.now() + daysToAdd * MS_PER_DAY).toISOString();
};

export { getDeliveryDate };