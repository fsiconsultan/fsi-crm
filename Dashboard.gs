/**
 * DASHBOARD STATISTICS
 */
function getDashboardStats(token) {

  const session = requireLogin(token);

  let leads;

  if (session.role === 'Admin') {
    leads = getAllLeads(token);
  } else {
    leads = getMyLeads(token);
  }

  const stats = {
    total: leads.length,
    new: 0,
    interested: 0,
    followUp: 0,
    appointment: 0,
    siteSurvey: 0,
    quotation: 0,
    spk: 0,
    closing: 0,
    notInterested: 0
  };

  leads.forEach(function(lead) {

    const status =
      String(lead.status || '')
        .toLowerCase();

    if (status === 'new') stats.new++;
    if (status === 'interested') stats.interested++;
    if (status === 'follow-up') stats.followUp++;
    if (status === 'appointment') stats.appointment++;
    if (status === 'site survey') stats.siteSurvey++;
    if (status === 'quotation') stats.quotation++;
    if (status === 'spk') stats.spk++;
    if (status === 'closing') stats.closing++;
    if (status === 'not interested') stats.notInterested++;
  });

  return stats;
}
