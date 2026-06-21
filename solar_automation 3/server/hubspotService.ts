/**
 * HubSpot CRM Integration Service
 * Handles contact creation, deal creation, and deal-contact associations
 * Deal amount uses financials.savings20YearsRON.toString()
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || '';
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

export interface HubSpotContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  address?: string;
}

export interface HubSpotDeal {
  dealName: string;
  dealAmount: string; // Must be string (savings20YearsRON.toString())
  dealStage: string;
  closeDate?: string;
  description?: string;
}

export interface HubSpotAssociation {
  contactId: string;
  dealId: string;
}

/**
 * Create or update a contact in HubSpot
 */
export async function createOrUpdateContact(contact: HubSpotContact): Promise<{ id: string } | null> {
  try {
    console.log(`[HubSpot] Creating/updating contact: ${contact.email}`);

    const properties = [
      { property: 'email', value: contact.email },
      { property: 'firstname', value: contact.firstName || '' },
      { property: 'lastname', value: contact.lastName || '' },
      { property: 'phone', value: contact.phone || '' },
      { property: 'company', value: contact.company || '' },
      { property: 'address', value: contact.address || '' },
    ];

    const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      console.error(`[HubSpot] Contact creation failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    console.log(`[HubSpot] ✓ Contact created/updated: ${data.id}`);
    return { id: data.id };
  } catch (error) {
    console.error('[HubSpot] Contact creation error:', error);
    return null;
  }
}

/**
 * Create a deal in HubSpot
 * Deal amount must be passed as string (financials.savings20YearsRON.toString())
 */
export async function createDeal(deal: HubSpotDeal): Promise<{ id: string } | null> {
  try {
    console.log(`[HubSpot] Creating deal: ${deal.dealName} (amount: ${deal.dealAmount} RON)`);

    const properties = [
      { property: 'dealname', value: deal.dealName },
      { property: 'dealstage', value: deal.dealStage || 'negotiation' },
      { property: 'amount', value: deal.dealAmount }, // String format
      { property: 'closedate', value: deal.closeDate || new Date().toISOString() },
      { property: 'description', value: deal.description || '' },
    ];

    const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      console.error(`[HubSpot] Deal creation failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    console.log(`[HubSpot] ✓ Deal created: ${data.id}`);
    return { id: data.id };
  } catch (error) {
    console.error('[HubSpot] Deal creation error:', error);
    return null;
  }
}

/**
 * Associate a contact with a deal
 * Uses batch endpoint: POST /crm/v3/associations/contacts/deals/batch/create
 */
export async function associateContactWithDeal(contactId: string, dealId: string): Promise<boolean> {
  try {
    console.log(`[HubSpot] Associating contact ${contactId} with deal ${dealId}`);

    const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/associations/contacts/deals/batch/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [
          {
            id: contactId,
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationType: 'contact_to_deal',
              },
            ],
            association: {
              id: dealId,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[HubSpot] Association failed: ${response.status}`);
      return false;
    }

    console.log(`[HubSpot] ✓ Contact-deal association created`);
    return true;
  } catch (error) {
    console.error('[HubSpot] Association error:', error);
    return false;
  }
}

/**
 * Upsert lead: create contact and deal, then associate them
 */
export async function upsertLead(
  companyName: string,
  email: string,
  address: string,
  financialData: any
): Promise<{ contactId?: string; dealId?: string; associated: boolean }> {
  try {
    console.log(`[HubSpot] Upserting lead: ${companyName} (${email})`);

    // Create or update contact
    const contactResult = await createOrUpdateContact({
      email,
      company: companyName,
      address,
    });

    if (!contactResult) {
      console.error('[HubSpot] Failed to create contact');
      return { associated: false };
    }

    // Create deal with savings20YearsRON as deal amount (string format)
    const dealAmount = financialData.savings20YearsRON?.toString() || '0';
    const dealResult = await createDeal({
      dealName: `Solar Proposal - ${companyName}`,
      dealAmount,
      dealStage: 'negotiation',
      description: `Solar investment proposal for ${companyName}. Annual savings: ${financialData.annualSavingsRON} RON. Payback period: ${financialData.paybackYears} years.`,
    });

    if (!dealResult) {
      console.error('[HubSpot] Failed to create deal');
      return { contactId: contactResult.id, associated: false };
    }

    // Associate contact with deal
    const associated = await associateContactWithDeal(contactResult.id, dealResult.id);

    console.log(`[HubSpot] ✓ Lead upserted: contact ${contactResult.id}, deal ${dealResult.id}, associated: ${associated}`);
    return { contactId: contactResult.id, dealId: dealResult.id, associated };
  } catch (error) {
    console.error('[HubSpot] Upsert error:', error);
    return { associated: false };
  }
}
