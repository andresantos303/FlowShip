import { getDeliveryDate, normalizePostalCode } from '../rateHelpers'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';

export const calculateTableRates = async (rateRequestInfo: any, activeTableCarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];
    const destinationCountryCode = rateRequestInfo.ShipTo.Country;
    const rawPostalCode = rateRequestInfo.ShipTo.PostalCode || "";
    const packageWeight = rateRequestInfo.PackageWeight.Weight;
    
    const normalizedZip = normalizePostalCode(rawPostalCode);

    // Mensagens de diagnóstico no terminal do servidor
    console.log(`\n--- [CÁLCULO DE TARIFAS] Novo Processamento ---`);
    console.log(`[INFO] Código Postal: ${rawPostalCode} (Normalizado: ${normalizedZip})`);
    console.log(`[INFO] País: ${destinationCountryCode} | Peso: ${packageWeight}Kg`);
    console.log(`[INFO] Transportadoras ativas recebidas da BD: ${activeTableCarriers.length}`);

    for (const carrier of activeTableCarriers) {
        let matchedRule = null;
        
        console.log(`\n[AVALIAÇÃO] Transportadora: ${carrier.name} (ID: ${carrier.id})`);
        console.log(`[AVALIAÇÃO] Total de regras associadas na BD: ${carrier.rules?.length || 0}`);

        if (!carrier.rules || carrier.rules.length === 0) {
            console.log(`[AVALIAÇÃO] Ignorada: Esta transportadora não possui regras na base de dados.`);
            continue;
        }

        for (const rule of carrier.rules) {
            if (rule.countryCode !== destinationCountryCode) {
                console.log(`[REGRA REJEITADA] ID: ${rule.id} - País não coincide (${rule.countryCode} vs ${destinationCountryCode})`);
                continue;
            }

            if (rule.matchType === 'EXACT') {
                const exactVal = normalizePostalCode(rule.postalCodeRange);
                if (normalizedZip === exactVal) {
                    matchedRule = rule;
                    console.log(`[REGRA COMPATÍVEL] Tipo EXACT correspondido para: ${rule.postalCodeRange}`);
                    break;
                }
            }

            if (rule.matchType === 'PREFIX') {
                const prefix = rule.postalCodeRange.replace(/\*/g, '').toUpperCase();
                if (normalizedZip.startsWith(prefix)) {
                    matchedRule = rule;
                    console.log(`[REGRA COMPATÍVEL] Tipo PREFIX correspondido para: ${rule.postalCodeRange}`);
                    break;
                }
            }

            if (rule.matchType === 'RANGE') {
                const parts = rule.postalCodeRange.split('-');
                if (parts.length === 2) {
                    const minStr = normalizePostalCode(parts[0]);
                    const maxStr = normalizePostalCode(parts[1]);
                    
                    // Adjust the length of the zip code to compare based on the length of the min/max in the rule
                    const lengthToCompare = minStr.length;
                    const zipToCompare = normalizedZip.substring(0, lengthToCompare);

                    const zipNum = parseInt(zipToCompare, 10);
                    const minNum = parseInt(minStr, 10);
                    const maxNum = parseInt(maxStr, 10);

                    if (!isNaN(zipNum) && !isNaN(minNum) && !isNaN(maxNum)) {
                        if (zipNum >= minNum && zipNum <= maxNum) {
                            matchedRule = rule;
                            console.log(`[REGRA COMPATÍVEL] Tipo RANGE correspondido para: ${rule.postalCodeRange}`);
                            break;
                        }
                    }
                }
            }
        }

        // If found a matching rule, now need to check the weight brackets
        if (matchedRule) {
            console.log(`[TARIFAS] A analisar ${matchedRule.rates?.length || 0} escalões de peso para a regra encontrada.`);
            const applicableRates = matchedRule.rates.filter((r: any) => packageWeight <= r.maxWeight);
            console.log(`[TARIFAS] Escalões que suportam o peso de ${packageWeight}Kg: ${applicableRates.length}`);

            if (applicableRates.length > 0) {
                applicableRates.sort((a: any, b: any) => a.maxWeight - b.maxWeight);
                const bestRate = applicableRates[0];

                availableRates.push({
                    service_name: carrier.name,
                    service_code: `${carrier.name}-table`,
                    total_price: Math.round(bestRate.price * 100),
                    currency: rateRequestInfo.currency,
                    description: carrier.description,
                    min_delivery_date: getDeliveryDate(bestRate.deliveryTime),
                    max_delivery_date: getDeliveryDate(bestRate.deliveryTime + 2)
                });
                logger.info(`Transportadora ${carrier.name} aplicou regra para o postal ${rawPostalCode}`);
            } else {
                console.log(`[TARIFAS] Nenhuma tarifa serve para o peso de ${packageWeight}Kg nesta transportadora.`);
            }
        } else {
            console.log(`[AVALIAÇÃO] Nenhuma regra geográfica serviu para a transportadora ${carrier.name}.`);
        }
    }
    
    console.log(`--- [CÁLCULO DE TARIFAS] Fim do Processo. Retornadas ${availableRates.length} opções ---\n`);
    return availableRates;
};