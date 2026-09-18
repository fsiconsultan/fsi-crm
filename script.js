// ================================
// SAVE LEAD
// ================================

async function saveLead() {

  if (!currentProfile) {

    alert(
      "User profile belum siap."
    );

    return;
  }


  const customer =
    document
      .getElementById(
        "leadCustomer"
      )
      .value
      .trim();


  if (!customer) {

    alert(
      "Customer wajib diisi."
    );

    return;
  }


  const leadId =
    document.getElementById(
      "leadId"
    ).value;


  const payload = {

    customer_name:
      document
        .getElementById(
          "leadCustomer"
        )
        .value
        .trim(),

    phone:
      document
        .getElementById(
          "leadPhone"
        )
        .value
        .trim(),

    business:
      document
        .getElementById(
          "leadBusiness"
        )
        .value
        .trim(),

    location:
      document
        .getElementById(
          "leadLocation"
        )
        .value
        .trim(),

    status:
      document.getElementById(
        "leadStatus"
      ).value,

    follow_up_date:
      document.getElementById(
        "leadFollowUp"
      ).value ||
      null,

    appointment:
      document.getElementById(
        "leadAppointment"
      ).value ||
      null,

    site_survey:
      document.getElementById(
        "leadSiteSurvey"
      ).value ||
      null,

    quotation:
      document.getElementById(
        "leadQuotation"
      ).value ||
      null,

    spk:
      document.getElementById(
        "leadSPK"
      ).value ||
      null,

    closing:
      document.getElementById(
        "leadClosing"
      ).value ||
      null,

    notes:
      document
        .getElementById(
          "leadNotes"
        )
        .value
        .trim()

  };


  try {

    // ==========================================
    // UPDATE EXISTING LEAD
    // ==========================================

    if (leadId) {

      // Siapa yang terakhir mengubah lead
      payload.updated_by =
        currentProfile.id;


      const {
        error
      } =
        await supabaseClient
          .from("leads")
          .update(
            payload
          )
          .eq(
            "id",
            leadId
          );


      if (error) {

        console.error(
          "Update lead error:",
          error
        );

        alert(
          "Gagal update lead:\n" +
          error.message
        );

        return;
      }


      alert(
        "Lead berhasil diupdate."
      );

    }


    // ==========================================
    // CREATE NEW LEAD
    // ==========================================

    else {

      // Siapa pemilik / Sales lead
      payload.sales_id =
        currentProfile.id;

      // Siapa yang pertama kali input
      payload.created_by =
        currentProfile.id;

      // Siapa yang terakhir update
      // Saat pertama dibuat = orang yang sama
      payload.updated_by =
        currentProfile.id;


      const {
        error
      } =
        await supabaseClient
          .from("leads")
          .insert([
            payload
          ]);


      if (error) {

        console.error(
          "Insert lead error:",
          error
        );

        alert(
          "Gagal menambahkan lead:\n" +
          error.message
        );

        return;
      }


      alert(
        "Lead berhasil ditambahkan."
      );

    }


    closeLeadModal();

    await loadLeads();

    await updateDashboard();


  } catch (error) {

    console.error(
      "saveLead error:",
      error
    );

    alert(
      "Terjadi kesalahan:\n" +
      error.message
    );

  }

}
