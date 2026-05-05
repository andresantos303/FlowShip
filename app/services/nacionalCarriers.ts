import logger from '../utils/logger';
import { getCTTOptions } from '../utils/rates/CTTRates'; 
import { getGLSOptions } from '../utils/rates/GLSRates';
import type { CarrierRate } from '../utils/rateHelpers.ts';

export const fetchAllNacionalRates = async (rateRequestInfo: any, prismaConfig: any): Promise<CarrierRate[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); 

  try {
    const allRates: CarrierRate[] = [];

    const cttRates = await getCTTOptions(rateRequestInfo);
    allRates.push(...cttRates);

    try {
      const glsRates = await Promise.race([
        getGLSOptions(rateRequestInfo, prismaConfig),
        new Promise<CarrierRate[]>((_, reject) => 
          setTimeout(() => reject(new Error('GLS Timeout')), 5000)
        )
      ]);
      allRates.push(...glsRates);
    } catch (glsError) {
      logger.error("GLS validation failed:", glsError);
    }

    clearTimeout(timeoutId);
    return allRates;

  } catch (error) {
    clearTimeout(timeoutId);
    logger.error("Error on fetching Nacional Rates:", error);
    return await getCTTOptions(rateRequestInfo);
  }
};