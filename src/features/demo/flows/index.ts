import type { Flow } from '../flowTypes';
import { crmInactiveFlow, emailOrderStatusFlow, freightFlow, reconciliationFlow } from './salesFlows';
import { analogyOfferFlow, preCloseFlow, quoteFromPdfFlow, versionMemoFlow } from './offerFlows';
import { coldChainFlow, emailOrderFlow, loadRouteFlow, productionPlanFlow } from './operationsFlows';
import { breakdownCallFlow, broadcastQaFlow, clinicalHelpdeskFlow, knowledgeQaFlow, qualityNcFlow, regulatoryFlow } from './serviceFlows';

export const FLOWS: Flow[] = [
  crmInactiveFlow, emailOrderStatusFlow, freightFlow,
  quoteFromPdfFlow, analogyOfferFlow, versionMemoFlow, preCloseFlow,
  emailOrderFlow, loadRouteFlow, productionPlanFlow, coldChainFlow,
  breakdownCallFlow, clinicalHelpdeskFlow,
  qualityNcFlow, broadcastQaFlow,
  regulatoryFlow, knowledgeQaFlow,
  reconciliationFlow,
];
