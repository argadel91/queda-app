// Email templates for queda.
// These generate HTML emails. To send them, wire up to a backend
// (Supabase Edge Function, Vercel API route, etc.)
// DO NOT put Resend API key in frontend code.

export const templates = {
  planInvite: (orgName, planName, planCode, url) => ({
    subject: `${orgName} te invita a ${planName}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px"><h1 style="font-size:24px;font-weight:800;margin-bottom:4px">queda<span style="color:#CDFF6C">.</span></h1><hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="font-size:16px;color:#333"><strong>${orgName}</strong> te ha invitado al plan <strong>${planName}</strong></p><a href="${url}" style="display:inline-block;padding:14px 28px;background:#CDFF6C;color:#0A0A0A;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:16px 0">Marcar disponibilidad →</a><p style="font-size:14px;color:#888">Código: <strong>${planCode}</strong></p><p style="font-size:12px;color:#aaa;margin-top:24px">queda. — Planes sin caos</p></div>`
  }),
  dateConfirmed: (planName, date, url) => ({
    subject: `📌 ${planName} — fecha confirmada`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px"><h1 style="font-size:24px;font-weight:800;margin-bottom:4px">queda<span style="color:#CDFF6C">.</span></h1><hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="font-size:16px;color:#333">La fecha de <strong>${planName}</strong> ha sido confirmada:</p><div style="background:#f8f8f8;border-radius:10px;padding:16px;text-align:center;margin:16px 0"><div style="font-size:24px;font-weight:800;color:#333">${date}</div></div><a href="${url}" style="display:inline-block;padding:14px 28px;background:#CDFF6C;color:#0A0A0A;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Ver detalles →</a><p style="font-size:12px;color:#aaa;margin-top:24px">queda. — Planes sin caos</p></div>`
  }),
  welcome: (name) => ({
    subject: `Bienvenido a queda. 🎉`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px"><h1 style="font-size:24px;font-weight:800;margin-bottom:4px">queda<span style="color:#CDFF6C">.</span></h1><hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="font-size:16px;color:#333">¡Hola <strong>${name}</strong>! 👋</p><p style="font-size:15px;color:#555;line-height:1.6">Tu cuenta está lista. Ahora puedes crear planes, compartirlos y coordinar con tu grupo sin caos.</p><a href="https://www.queda.xyz" style="display:inline-block;padding:14px 28px;background:#CDFF6C;color:#0A0A0A;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:16px 0">Crear mi primer plan →</a><p style="font-size:12px;color:#aaa;margin-top:24px">queda. — Planes sin caos</p></div>`
  }),
  reminder: (planName, date, url) => ({
    subject: `⏰ ${planName} es pronto`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px"><h1 style="font-size:24px;font-weight:800;margin-bottom:4px">queda<span style="color:#CDFF6C">.</span></h1><hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="font-size:16px;color:#333"><strong>${planName}</strong> es el <strong>${date}</strong></p><p style="font-size:15px;color:#555">¡No olvides prepararte!</p><a href="${url}" style="display:inline-block;padding:14px 28px;background:#CDFF6C;color:#0A0A0A;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:16px 0">Ver plan →</a><p style="font-size:12px;color:#aaa;margin-top:24px">queda. — Planes sin caos</p></div>`
  })
}
