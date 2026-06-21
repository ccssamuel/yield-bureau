/**
 * Comprehensive mock factory for all external services
 * Used in tests to run in complete isolation without live API calls
 */

export interface MockRedisClient {
  sendCommand: (args: string[]) => Promise<any>;
}

export interface MockOpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface MockGoogleSolarResponse {
  buildingInsights: {
    solarPotential: {
      maxArrayPanelsCount: number;
      maxSunshineHoursPerYear: number;
      wholeRoofStats: {
        areaMeters2: number;
      };
      solarPanelConfigs: Array<{
        panelsCount: number;
        yearlyEnergyDcKwh: number;
      }>;
    };
    imageryQuality: string;
    imageryDate: {
      year: number;
      month: number;
      day: number;
    };
  };
}

/**
 * Mock Redis/Upstash client
 */
export function createMockRedisClient(): MockRedisClient {
  const cache = new Map<string, { value: any; expiry: number }>();

  return {
    sendCommand: async (args: string[]) => {
      const command = args[0]?.toUpperCase();

      if (command === 'PING') {
        return 'PONG';
      }

      if (command === 'SET') {
        const [, key, value, , ttl] = args;
        const expiryTime = Date.now() + (parseInt(ttl) || 86400) * 1000;
        cache.set(key, { value, expiry: expiryTime });
        return 'OK';
      }

      if (command === 'GET') {
        const [, key] = args;
        const entry = cache.get(key);
        if (!entry) return null;
        if (entry.expiry < Date.now()) {
          cache.delete(key);
          return null;
        }
        return entry.value;
      }

      if (command === 'DEL') {
        const [, key] = args;
        cache.delete(key);
        return 1;
      }

      return null;
    },
  };
}

/**
 * Mock OpenAI client
 */
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: async (params: any): Promise<MockOpenAIResponse> => {
          const companyName = params.messages?.[1]?.content || 'Test Company';
          const solarCoverage = params.messages?.[1]?.content?.match(/\d+%/) || '85%';

          return {
            choices: [
              {
                message: {
                  content: `Analiză Investiție Solară - ${companyName}\n\nSistemul solar propus va acoperi aproximativ ${solarCoverage} din consumul anual de energie. Investiția inițială este de aproximativ 25,000 RON, cu o perioadă de rambursare de 3-4 ani. După 20 de ani, economiile estimate sunt de 120,000 RON.`,
                },
              },
            ],
          };
        },
      },
    },
  };
}

/**
 * Mock Google Solar API client
 */
export function createMockGoogleSolarClient() {
  return {
    buildingInsights: {
      findClosest: async (params: any): Promise<MockGoogleSolarResponse> => {
        return {
          buildingInsights: {
            solarPotential: {
              maxArrayPanelsCount: 86,
              maxSunshineHoursPerYear: 1233.8673,
              wholeRoofStats: {
                areaMeters2: 291.26123,
              },
              solarPanelConfigs: [
                { panelsCount: 1, yearlyEnergyDcKwh: 499.538 },
                { panelsCount: 50, yearlyEnergyDcKwh: 24035.396 },
                { panelsCount: 86, yearlyEnergyDcKwh: 40687.145 },
              ],
            },
            imageryQuality: 'HIGH',
            imageryDate: {
              year: 2023,
              month: 6,
              day: 15,
            },
          },
        };
      },
    },
  };
}

/**
 * Mock Google Maps Geocoding API
 */
export function createMockGoogleMapsClient() {
  return {
    geocode: async (params: any) => {
      const address = params.address || '';

      if (address.toLowerCase().includes('invalid')) {
        return { results: [] };
      }

      return {
        results: [
          {
            geometry: {
              location: {
                lat: 46.7712,
                lng: 23.6236,
              },
            },
          },
        ],
      };
    },
  };
}

/**
 * Mock Postmark email service
 */
export function createMockPostmarkClient() {
  const sentEmails: any[] = [];

  return {
    sendEmail: async (params: any) => {
      sentEmails.push(params);
      return {
        To: params.To,
        SubmittedAt: new Date().toISOString(),
        MessageID: `mock-${Date.now()}`,
      };
    },
    getSentEmails: () => sentEmails,
    clearSentEmails: () => {
      sentEmails.length = 0;
    },
  };
}

/**
 * Mock HubSpot API client
 */
export function createMockHubSpotClient() {
  const deals: Map<string, any> = new Map();
  const contacts: Map<string, any> = new Map();
  const associations: any[] = [];

  return {
    crm: {
      objects: {
        deals: {
          basicApi: {
            create: async (params: any) => {
              const dealId = `mock-deal-${Date.now()}`;
              deals.set(dealId, params.simplePublicObjectInput?.properties || {});
              return {
                id: dealId,
                properties: deals.get(dealId),
              };
            },
          },
        },
        contacts: {
          basicApi: {
            getById: async (params: any) => {
              const contactId = params.id;
              if (!contacts.has(contactId)) {
                contacts.set(contactId, { id: contactId });
              }
              return {
                id: contactId,
                properties: contacts.get(contactId),
              };
            },
          },
        },
      },
      associations: {
        batchApi: {
          create: async (params: any) => {
            associations.push(...(params.inputs || []));
            return {
              results: params.inputs || [],
            };
          },
        },
      },
    },
    getDeals: () => Array.from(deals.entries()),
    getAssociations: () => associations,
    clearData: () => {
      deals.clear();
      contacts.clear();
      associations.length = 0;
    },
  };
}

/**
 * Mock Puppeteer browser
 */
export function createMockPuppeteerBrowser() {
  return {
    newPage: async () => ({
      setContent: async () => {},
      evaluateHandle: async () => ({ dispose: async () => {} }),
      pdf: async () => Buffer.from('mock-pdf-content'),
      close: async () => {},
    }),
    close: async () => {},
  };
}

/**
 * Global mock registry for tests
 */
export const mockRegistry = {
  redis: createMockRedisClient(),
  openai: createMockOpenAIClient(),
  googleSolar: createMockGoogleSolarClient(),
  googleMaps: createMockGoogleMapsClient(),
  postmark: createMockPostmarkClient(),
  hubspot: createMockHubSpotClient(),
  puppeteer: createMockPuppeteerBrowser(),

  resetAll: () => {
    mockRegistry.postmark.clearSentEmails();
    mockRegistry.hubspot.clearData();
  },
};
