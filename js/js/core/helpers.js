// ==========================================
// PIPELINE CALCULATION & HELPER LOGIC (js/core/helpers.js)
// ==========================================

function crmGetCurrentPipelineKey(customer) {
  if (!customer) return "new";
  if (customer.closing) return "closing";
  if (customer.spk) return "spk";
  if (customer.quotation) return "quotation";
  if (customer.site_survey) return "survey";
  if (customer.appointment) return "appointment";

  const status = normalizeLeadStatus(customer.status);
  if (status === "Follow Up") return "followup";
  if (status === "Interested") return "interested";
  if (status === "Flyer Sent") return "flyer";
  return "new";
}

function crmIsPipelineCompleted(customer, step) {
  if (!customer) return false;
  const status = normalizeLeadStatus(customer.status);

  switch (step.key) {
    case "new":
      return true;
    case "flyer":
      return status === "Flyer Sent" || status === "Interested" || status === "Follow Up" || status === "Closing" || !!customer.appointment || !!customer.site_survey || !!customer.quotation || !!customer.spk || !!customer.closing;
    case "interested":
      return status === "Interested" || status === "Follow Up" || status === "Closing" || !!customer.appointment || !!customer.site_survey || !!customer.quotation || !!customer.spk || !!customer.closing;
    case "followup":
      return status === "Follow Up" || status === "Closing" || !!customer.follow_up_date || !!customer.appointment || !!customer.site_survey || !!customer.quotation || !!customer.spk || !!customer.closing;
    case "appointment": return !!customer.appointment;
    case "survey":      return !!customer.site_survey;
    case "quotation":   return !!customer.quotation;
    case "spk":         return !!customer.spk;
    case "closing":     return status === "Closing" || !!customer.closing;
    default:            return false;
  }
}

function crmGetPipelineProgress(customer) {
  const total = CUSTOMER_PIPELINE.length;
  const completed = CUSTOMER_PIPELINE.filter(step => crmIsPipelineCompleted(customer, step)).length;
  return Math.round((completed / total) * 100);
}
