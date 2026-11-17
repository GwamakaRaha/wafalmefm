import { doc, setDoc, getDocs, collection, query, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logAuditEvent } from './audit-service';

export async function checkHasData(): Promise<boolean> {
  if (!auth.currentUser) {
    return true; // Avoid unauthenticated Firestore query
  }
  try {
    const snap = await getDocs(query(collection(db, 'clients'), limit(1)));
    return !snap.empty;
  } catch (error) {
    return true;
  }
}

export async function seedWafalmeDatabase(user: { uid: string; email: string }): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  // 1. Initial Packages
  const packages = [
    {
      id: 'pkg_morning_prime',
      name: 'Asubuhi Njema Prime (Morning Drive)',
      description: 'Prime peak commuter slot with maximum listener retention and frequency.',
      priceTZS: 120000, // 120,000 TZS per 30-sec spot
      spotCount: 30,
      durationSeconds: 30,
      timeSlot: '06:00 - 10:00 EAT',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pkg_sunset_drive',
      name: 'Mchakamchaka Drive (Evening Rush)',
      description: 'High-energy evening drive show reaching urban commuters across Dar es Salaam & Morogoro.',
      priceTZS: 95000,
      spotCount: 25,
      durationSeconds: 30,
      timeSlot: '16:00 - 19:00 EAT',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pkg_midday_express',
      name: 'Wafalme Mchana (Midday Beats)',
      description: 'Midday entertainment and retail segment popular with office workers and traders.',
      priceTZS: 70000,
      spotCount: 20,
      durationSeconds: 30,
      timeSlot: '11:00 - 14:00 EAT',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pkg_sponsorship_feature',
      name: 'News Bulletin Title Sponsorship',
      description: 'Exclusive 10-second opening and closing billboard mention before national Swahili news.',
      priceTZS: 250000,
      spotCount: 15,
      durationSeconds: 15,
      timeSlot: 'Top of the Hour Bulletins',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const pkg of packages) {
    await setDoc(doc(db, 'packages', pkg.id), pkg, { merge: true });
  }

  // 2. Initial Clients
  const clients = [
    {
      id: 'client_vodacom',
      companyName: 'Vodacom Tanzania PLC',
      contactPerson: 'Zuwena Khamis',
      email: 'corporate.ads@vodacom.co.tz',
      phone: '+255 754 112 233',
      tinNumber: '100-245-890',
      vrnNumber: '40-001290-B',
      industry: 'Telecommunications',
      assignedSalesAgentId: user.uid,
      assignedSalesAgentName: 'Juma Mwamburi',
      status: 'active',
      notes: 'Key enterprise corporate client with quarterly multi-campaign commitments.',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'client_serengeti',
      companyName: 'Serengeti Breweries Ltd',
      contactPerson: 'Baraka Mrope',
      email: 'media@serengeti.co.tz',
      phone: '+255 784 990 011',
      tinNumber: '102-887-321',
      vrnNumber: '40-009844-A',
      industry: 'FMCG / Beverages',
      assignedSalesAgentId: user.uid,
      assignedSalesAgentName: 'Amani Kisumo',
      status: 'active',
      notes: 'Active for sports show sponsorships and weekend music countdown spots.',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      id: 'client_azam',
      companyName: 'Bakhresa Azam Media & Consumer',
      contactPerson: 'Salim Bakhresa',
      email: 'marketing@azam-group.com',
      phone: '+255 655 443 210',
      tinNumber: '101-554-998',
      vrnNumber: '40-007712-C',
      industry: 'Manufacturing & Consumer Products',
      assignedSalesAgentId: user.uid,
      assignedSalesAgentName: 'Juma Mwamburi',
      status: 'active',
      notes: 'Runs concurrent promotional campaigns for Azam Cola and Azam TV decoders.',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 'client_crdb',
      companyName: 'CRDB Bank Foundation',
      contactPerson: 'Grace Minja',
      email: 'pr@crdbbank.co.tz',
      phone: '+255 713 882 109',
      tinNumber: '100-112-909',
      vrnNumber: '40-000455-Z',
      industry: 'Banking & Financial Services',
      assignedSalesAgentId: user.uid,
      assignedSalesAgentName: 'Amani Kisumo',
      status: 'active',
      notes: 'Campaign for SimBanking & youth financial literacy.',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  for (const client of clients) {
    await setDoc(doc(db, 'clients', client.id), client, { merge: true });
  }

  // 3. Independent Campaigns (One client has multiple independent campaigns!)
  const campaigns = [
    {
      id: 'camp_voda_5g',
      campaignCode: 'WFM-2026-001',
      clientId: 'client_vodacom',
      clientName: 'Vodacom Tanzania PLC',
      title: 'Vodacom 5G Kasi Isiyo na Kikomo',
      packageId: 'pkg_morning_prime',
      packageName: 'Asubuhi Njema Prime (Morning Drive)',
      salesAgentId: user.uid,
      salesAgentName: 'Juma Mwamburi',
      startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      totalSpotsBooked: 60,
      totalSpotsAired: 28,
      totalAmountTZS: 7200000,
      paidAmountTZS: 7200000,
      status: 'active',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'camp_voda_mpesa',
      campaignCode: 'WFM-2026-002',
      clientId: 'client_vodacom', // SAME CLIENT, MULTIPLE INDEPENDENT CAMPAIGN!
      clientName: 'Vodacom Tanzania PLC',
      title: 'M-Pesa Lipa Hapa Ni Rahisi',
      packageId: 'pkg_sunset_drive',
      packageName: 'Mchakamchaka Drive (Evening Rush)',
      salesAgentId: user.uid,
      salesAgentName: 'Juma Mwamburi',
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
      totalSpotsBooked: 50,
      totalSpotsAired: 14,
      totalAmountTZS: 4750000,
      paidAmountTZS: 2500000,
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'camp_serengeti_football',
      campaignCode: 'WFM-2026-003',
      clientId: 'client_serengeti',
      clientName: 'Serengeti Breweries Ltd',
      title: 'Serengeti Lite Weekend Derby Live',
      packageId: 'pkg_sunset_drive',
      packageName: 'Mchakamchaka Drive (Evening Rush)',
      salesAgentId: user.uid,
      salesAgentName: 'Amani Kisumo',
      startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 16 * 86400000).toISOString(),
      totalSpotsBooked: 40,
      totalSpotsAired: 22,
      totalAmountTZS: 3800000,
      paidAmountTZS: 3800000,
      status: 'active',
      createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    },
    {
      id: 'camp_azam_cola',
      campaignCode: 'WFM-2026-004',
      clientId: 'client_azam',
      clientName: 'Bakhresa Azam Media & Consumer',
      title: 'Azam Energy Refresh Promo',
      packageId: 'pkg_midday_express',
      packageName: 'Wafalme Mchana (Midday Beats)',
      salesAgentId: user.uid,
      salesAgentName: 'Juma Mwamburi',
      startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 28 * 86400000).toISOString(),
      totalSpotsBooked: 45,
      totalSpotsAired: 6,
      totalAmountTZS: 3150000,
      paidAmountTZS: 1500000,
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ];

  for (const campaign of campaigns) {
    await setDoc(doc(db, 'campaigns', campaign.id), campaign, { merge: true });
  }

  // 4. Initial Payments
  const payments = [
    {
      id: 'pay_rcpt_001',
      receiptNumber: 'WFM-RCT-1082',
      campaignId: 'camp_voda_5g',
      campaignTitle: 'Vodacom 5G Kasi Isiyo na Kikomo',
      clientId: 'client_vodacom',
      clientName: 'Vodacom Tanzania PLC',
      amountTZS: 7200000,
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'BOT-RTGS-9901428',
      recordedByUid: user.uid,
      recordedByName: 'Fatma Salum (Finance)',
      paymentDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: 'verified',
      notes: 'Full payment cleared via Standard Chartered Bank.',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'pay_rcpt_002',
      receiptNumber: 'WFM-RCT-1083',
      campaignId: 'camp_serengeti_football',
      campaignTitle: 'Serengeti Lite Weekend Derby Live',
      clientId: 'client_serengeti',
      clientName: 'Serengeti Breweries Ltd',
      amountTZS: 3800000,
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'CRDB-TXN-442811',
      recordedByUid: user.uid,
      recordedByName: 'Fatma Salum (Finance)',
      paymentDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      status: 'verified',
      notes: 'Cleared payment.',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'pay_rcpt_003',
      receiptNumber: 'WFM-RCT-1084',
      campaignId: 'camp_voda_mpesa',
      campaignTitle: 'M-Pesa Lipa Hapa Ni Rahisi',
      clientId: 'client_vodacom',
      clientName: 'Vodacom Tanzania PLC',
      amountTZS: 2500000,
      paymentMethod: 'M-Pesa',
      referenceNumber: 'MP-8924001',
      recordedByUid: user.uid,
      recordedByName: 'Fatma Salum (Finance)',
      paymentDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      status: 'verified',
      notes: '50% mobilization advance deposit received via Vodacom Till.',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ];

  for (const payment of payments) {
    await setDoc(doc(db, 'payments', payment.id), payment, { merge: true });
  }

  // 5. Broadcast Schedules & Confirmed Logs
  const schedules = [
    {
      id: 'sched_today_01',
      campaignId: 'camp_voda_5g',
      campaignTitle: 'Vodacom 5G Kasi Isiyo na Kikomo',
      clientName: 'Vodacom Tanzania PLC',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
      showName: 'Kikosi Cha Asubuhi',
      timeSlot: '07:15 - 07:16 EAT',
      status: 'scheduled',
      assignedPresenterUid: user.uid,
      assignedPresenterName: 'Khamis Masoud',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sched_today_02',
      campaignId: 'camp_serengeti_football',
      campaignTitle: 'Serengeti Lite Weekend Derby Live',
      clientName: 'Serengeti Breweries Ltd',
      scheduledTime: new Date(Date.now() + 7200000).toISOString(),
      showName: 'Wafalme Michezo Sports Hour',
      timeSlot: '08:45 - 08:46 EAT',
      status: 'scheduled',
      assignedPresenterUid: user.uid,
      assignedPresenterName: 'Khamis Masoud',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sched_today_03',
      campaignId: 'camp_azam_cola',
      campaignTitle: 'Azam Energy Refresh Promo',
      clientName: 'Bakhresa Azam Media & Consumer',
      scheduledTime: new Date(Date.now() - 1800000).toISOString(),
      showName: 'Kikosi Cha Asubuhi',
      timeSlot: '06:45 - 06:46 EAT',
      status: 'aired',
      assignedPresenterUid: user.uid,
      assignedPresenterName: 'Mariam Said',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const sched of schedules) {
    await setDoc(doc(db, 'broadcastSchedules', sched.id), sched, { merge: true });
  }

  // Confirmed Broadcast Log
  const broadcastLog = {
    id: 'log_conf_001',
    scheduleId: 'sched_today_03',
    campaignId: 'camp_azam_cola',
    campaignTitle: 'Azam Energy Refresh Promo',
    clientName: 'Bakhresa Azam Media & Consumer',
    airedAt: new Date(Date.now() - 1800000).toISOString(),
    presenterUid: user.uid,
    presenterName: 'Mariam Said (On-Air Presenter)',
    verified: true,
    transmissionNotes: 'Studio cart #04 played smoothly at 06:45:12 AM with full 30-sec playback.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  };

  await setDoc(doc(db, 'broadcastLogs', broadcastLog.id), broadcastLog, { merge: true });

  // 6. Swahili SMS Logs
  const smsLogs = [
    {
      id: 'sms_log_001',
      clientId: 'client_azam',
      clientName: 'Bakhresa Azam Media & Consumer',
      recipientPhone: '+255 655 443 210',
      messageBody: 'Wafalme FM: Tangazo la Azam Energy Refresh Promo limerushwa hewani saa 06:45 asubuhi kwenye Kikosi Cha Asubuhi. Asante.',
      templateType: 'broadcast_confirmation',
      dispatchStatus: 'delivered',
      dispatchedAt: new Date(Date.now() - 1700000).toISOString(),
      createdAt: new Date(Date.now() - 1700000).toISOString(),
    },
    {
      id: 'sms_log_002',
      clientId: 'client_vodacom',
      clientName: 'Vodacom Tanzania PLC',
      recipientPhone: '+255 754 112 233',
      messageBody: 'Wafalme FM: Tumepokea malipo yako ya TZS 2,500,000 kwa Kampeni #WFM-2026-002 kupitia M-Pesa. Risiti #WFM-RCT-1084.',
      templateType: 'payment_receipt',
      dispatchStatus: 'delivered',
      dispatchedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ];

  for (const sms of smsLogs) {
    await setDoc(doc(db, 'smsLogs', sms.id), sms, { merge: true });
  }

  await logAuditEvent({
    performedByUid: user.uid,
    performedByEmail: user.email,
    action: 'SEED_INITIAL_DATABASE',
    targetCollection: 'system',
    details: 'Seeded standard Wafalme FM commercial packages, corporate clients, active campaigns, schedules, and Swahili SMS logs.',
  });
}
