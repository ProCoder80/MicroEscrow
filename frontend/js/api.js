/**
 * MicroEscrow — Frontend API Client
 * Communicates with backend Express/MySQL endpoints
 */

const ApiClient = (() => {
  const BASE_URL = window.location.origin;

  async function request(path, options = {}) {
    try {
      const url = `${BASE_URL}${path}`;
      const config = {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      };
      const res = await fetch(url, config);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${path}:`, err);
      throw err;
    }
  }

  return {
    async fetchCampaigns() {
      const res = await request('/api/campaigns');
      return res.data || [];
    },

    async fetchCampaign(id) {
      const res = await request(`/api/campaigns/${id}`);
      return res.data || null;
    },

    async createCampaign({ title, targetAmount, category, deadlineHours, description }) {
      const res = await request('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ title, targetAmount, category, deadlineHours, description })
      });
      return res.data;
    },

    async updateThreshold(id, targetAmount) {
      const res = await request(`/api/campaigns/${id}/threshold`, {
        method: 'PATCH',
        body: JSON.stringify({ targetAmount })
      });
      return res;
    },

    async disburseFunds(id) {
      const res = await request(`/api/campaigns/${id}/disburse`, {
        method: 'POST'
      });
      return res;
    },

    async refundCampaign(id) {
      const res = await request(`/api/campaigns/${id}/refund`, {
        method: 'POST'
      });
      return res;
    },

    async deleteCampaign(id) {
      const res = await request(`/api/campaigns/${id}`, {
        method: 'DELETE'
      });
      return res;
    },

    async fetchPledges(campaignId) {
      const res = await request(`/api/pledges/campaign/${campaignId}`);
      return res.data || [];
    },

    async submitPledge({ campaignId, name, rollNo, phone, tier, amount }) {
      const res = await request('/api/pledges', {
        method: 'POST',
        body: JSON.stringify({ campaignId, name, rollNo, phone, tier, amount })
      });
      return res;
    },

    async resetDemo() {
      const res = await request('/api/campaigns/reset-demo', {
        method: 'POST'
      });
      return res;
    },

    // ──── Authentication ────
    async login({ identifier, password, role }) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, role })
      });
      return res;
    },

    async register(userData) {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      return res;
    },

    async getMe(id) {
      const res = await request(`/api/auth/me/${id}`);
      return res.user;
    },

    async getMyPledges(userId) {
      const res = await request(`/api/auth/my-pledges/${userId}`);
      return res.data || [];
    }
  };
})();
